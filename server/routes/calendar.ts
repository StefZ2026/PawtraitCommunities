// Calendar routes — create, generate, select, assign, checkout, order
import type { Express, Response } from "express";
import { isAuthenticated } from "../auth";
import { pool } from "../db";
import { storage } from "../storage";
import { generatePortrait } from "../portrait-engine";
import { generateGroupPortrait, isGroupPortraitConfigured } from "../group-portrait";
import { uploadToStorage, isDataUri } from "../image-storage";
import { getCalendarStyles, getCalendarPrompt, type CalendarStyle } from "../../client/src/lib/calendar-styles";
import { isStripeConfigured, getStripe } from "../stripe";
import { generateCalendarPDF, createCollageCover } from "../calendar-pdf";
import { createCalendarOrder, isGelatoConfigured } from "../gelato";
import rateLimit from "express-rate-limit";

const calendarLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, keyGenerator: (req: any) => req.user?.claims?.sub || "anon" });

export function registerCalendarRoutes(app: Express): void {

  // Create a new calendar project
  app.post("/api/calendar/create", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const resResult = await pool.query("SELECT id, organization_id FROM residents WHERE supabase_auth_id = $1 AND is_active = true LIMIT 1", [userId]);
      if (resResult.rows.length === 0) return res.status(403).json({ error: "Must be a registered resident" });
      const resident = resResult.rows[0];

      const { calendarName, calendarYear, startMonth, birthdayMonth, petIds, isMultiPet, multiPetMode } = req.body;
      if (!calendarYear || !petIds || !petIds.length) return res.status(400).json({ error: "Calendar year and at least one pet are required" });

      const priceCents = isMultiPet ? 9000 : 7500;
      const maxGen = isMultiPet ? 30 : 24;
      const dogId = petIds[0]; // Primary pet for the dogId FK

      const result = await pool.query(
        `INSERT INTO calendar_projects (organization_id, resident_id, dog_id, calendar_year, start_month, calendar_name, birthday_month, is_multi_pet, multi_pet_mode, pet_ids, price_cents, max_generations, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'starting') RETURNING id`,
        [resident.organization_id, resident.id, dogId, calendarYear, startMonth || 1, calendarName || null, birthdayMonth || null, isMultiPet || false, multiPetMode || null, JSON.stringify(petIds), priceCents, maxGen]
      );

      res.status(201).json({ id: result.rows[0].id, status: "starting", priceCents });
    } catch (err: any) {
      console.error("[calendar] Create error:", err.message);
      res.status(500).json({ error: "Failed to create calendar project" });
    }
  });

  // Get calendar project with all images
  app.get("/api/calendar/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const project = await pool.query("SELECT * FROM calendar_projects WHERE id = $1", [req.params.id]);
      if (project.rows.length === 0) return res.status(404).json({ error: "Not found" });

      const images = await pool.query(
        "SELECT * FROM calendar_project_images WHERE calendar_project_id = $1 ORDER BY sort_order, created_at",
        [req.params.id]
      );

      res.json({ project: project.rows[0], images: images.rows });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to load calendar" });
    }
  });

  // Trigger batch generation
  app.post("/api/calendar/:id/generate", isAuthenticated, calendarLimiter, async (req: any, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await pool.query("SELECT * FROM calendar_projects WHERE id = $1", [projectId]);
      if (project.rows.length === 0) return res.status(404).json({ error: "Not found" });
      const cal = project.rows[0];

      if (cal.total_generations >= cal.max_generations) {
        return res.status(400).json({ error: "Generation limit reached" });
      }

      const petIds = JSON.parse(cal.pet_ids || "[]");
      const pets = await pool.query("SELECT id, name, species, breed, original_photo_url FROM dogs WHERE id = ANY($1)", [petIds]);
      if (pets.rows.length === 0) return res.status(400).json({ error: "No pets found" });

      const primaryPet = pets.rows[0];
      const species = primaryPet.species || "dog";
      const breed = primaryPet.breed || species;
      const isMulti = cal.is_multi_pet && pets.rows.length > 1;

      // Get styles for this calendar
      const styles = getCalendarStyles(species as "dog" | "cat", cal.birthday_month || undefined);
      const remaining = cal.max_generations - cal.total_generations;
      const toGenerate = Math.min(styles.length, remaining);
      const selectedStyles = styles.slice(0, toGenerate);

      // Update status
      await pool.query("UPDATE calendar_projects SET status = 'generating' WHERE id = $1", [projectId]);

      // Generate in background
      res.json({ status: "generating", count: selectedStyles.length, totalAfter: cal.total_generations + selectedStyles.length });

      // Background generation
      let generated = 0;
      for (const style of selectedStyles) {
        try {
          const prompt = getCalendarPrompt(style, species as "dog" | "cat", breed);
          let imageUrl: string;

          if (isMulti && pets.rows.length > 1) {
            const sourceUrls = pets.rows.map((p: any) => p.original_photo_url).filter(Boolean);
            if (sourceUrls.length > 1) {
              imageUrl = await generateGroupPortrait(prompt, sourceUrls);
            } else {
              imageUrl = await generatePortrait(prompt, primaryPet.original_photo_url);
            }
          } else {
            imageUrl = await generatePortrait(prompt, primaryPet.original_photo_url);
          }

          // Upload to storage if data URI
          let finalUrl = imageUrl;
          if (isDataUri(imageUrl)) {
            const fname = `calendar-${projectId}-${style.name.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.png`;
            finalUrl = await uploadToStorage(imageUrl, "portraits", fname);
          }

          // Save image record
          await pool.query(
            `INSERT INTO calendar_project_images (calendar_project_id, image_type, image_url, style_id, month_assignment, sort_order)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [projectId, style.isWildCard ? "wildcard" : "monthly", finalUrl, null, style.isWildCard ? null : style.month, generated]
          );

          generated++;
          await pool.query(
            "UPDATE calendar_projects SET total_generations = total_generations + 1, generated_image_count = generated_image_count + 1 WHERE id = $1",
            [projectId]
          );
        } catch (genErr: any) {
          console.error(`[calendar] Generation failed for style ${style.name}:`, genErr.message);
        }
      }

      // Update status
      await pool.query("UPDATE calendar_projects SET status = 'selecting' WHERE id = $1", [projectId]);
      console.log(`[calendar] Generated ${generated}/${selectedStyles.length} images for project ${projectId}`);
    } catch (err: any) {
      console.error("[calendar] Generate error:", err.message);
      res.status(500).json({ error: "Failed to start generation" });
    }
  });

  // Regenerate — add more images
  app.post("/api/calendar/:id/regenerate", isAuthenticated, calendarLimiter, async (req: any, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await pool.query("SELECT * FROM calendar_projects WHERE id = $1", [projectId]);
      if (project.rows.length === 0) return res.status(404).json({ error: "Not found" });
      const cal = project.rows[0];

      const remaining = cal.max_generations - cal.total_generations;
      if (remaining <= 0) return res.status(400).json({ error: "Generation limit reached. Maximum " + cal.max_generations + " images." });

      const toGenerate = Math.min(6, remaining);

      const petIds = JSON.parse(cal.pet_ids || "[]");
      const pets = await pool.query("SELECT id, name, species, breed, original_photo_url FROM dogs WHERE id = ANY($1)", [petIds]);
      if (pets.rows.length === 0) return res.status(400).json({ error: "No pets found" });
      const primaryPet = pets.rows[0];
      const species = primaryPet.species || "dog";
      const breed = primaryPet.breed || species;

      // Get wild card styles not yet used
      const existingImages = await pool.query("SELECT style_id FROM calendar_project_images WHERE calendar_project_id = $1", [projectId]);
      const usedStyleIds = new Set(existingImages.rows.map((r: any) => r.style_id));
      const allStyles = getCalendarStyles(species as "dog" | "cat", cal.birthday_month || undefined);
      const unusedStyles = allStyles.filter(s => !usedStyleIds.has(s.name)).slice(0, toGenerate);

      await pool.query("UPDATE calendar_projects SET status = 'generating' WHERE id = $1", [projectId]);
      res.json({ status: "regenerating", count: unusedStyles.length, remaining: remaining - unusedStyles.length });

      // Background generation
      let generated = 0;
      for (const style of unusedStyles) {
        try {
          const prompt = getCalendarPrompt(style, species as "dog" | "cat", breed);
          const imageUrl = await generatePortrait(prompt, primaryPet.original_photo_url);
          let finalUrl = imageUrl;
          if (isDataUri(imageUrl)) {
            const fname = `calendar-${projectId}-regen-${style.name.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.png`;
            finalUrl = await uploadToStorage(imageUrl, "portraits", fname);
          }
          await pool.query(
            `INSERT INTO calendar_project_images (calendar_project_id, image_type, image_url, style_id, month_assignment, sort_order)
             VALUES ($1, 'wildcard', $2, $3, NULL, $4)`,
            [projectId, finalUrl, style.name, cal.total_generations + generated]
          );
          generated++;
          await pool.query("UPDATE calendar_projects SET total_generations = total_generations + 1, generated_image_count = generated_image_count + 1 WHERE id = $1", [projectId]);
        } catch (e: any) { console.error(`[calendar] Regen failed for ${style.name}:`, e.message); }
      }
      await pool.query("UPDATE calendar_projects SET status = 'selecting' WHERE id = $1", [projectId]);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to regenerate" });
    }
  });

  // Save selected images (hearts)
  app.post("/api/calendar/:id/select", isAuthenticated, async (req: any, res: Response) => {
    try {
      const { selectedImageIds } = req.body;
      if (!selectedImageIds || selectedImageIds.length !== 12) {
        return res.status(400).json({ error: "Please select exactly 12 images" });
      }

      const projectId = parseInt(req.params.id);
      // Mark all as unselected first
      await pool.query("UPDATE calendar_project_images SET image_type = REPLACE(image_type, '-selected', '') WHERE calendar_project_id = $1", [projectId]);

      // Mark selected
      for (const imgId of selectedImageIds) {
        await pool.query(
          "UPDATE calendar_project_images SET image_type = image_type || '-selected' WHERE id = $1 AND calendar_project_id = $2",
          [imgId, projectId]
        );
      }

      await pool.query("UPDATE calendar_projects SET selected_image_count = 12, status = 'assigning' WHERE id = $1", [projectId]);
      res.json({ success: true, selectedCount: 12 });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to save selections" });
    }
  });

  // Auto-curate — smart pick best 12
  app.post("/api/calendar/:id/auto-curate", isAuthenticated, async (req: any, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      const images = await pool.query(
        "SELECT id, image_type, month_assignment FROM calendar_project_images WHERE calendar_project_id = $1 ORDER BY sort_order",
        [projectId]
      );

      if (images.rows.length < 12) {
        return res.status(400).json({ error: "Not enough images to curate. Need at least 12." });
      }

      // Smart selection: prioritize monthly themes first, fill with best wild cards
      const monthly = images.rows.filter((img: any) => img.month_assignment && !img.image_type.includes("wildcard"));
      const wildcards = images.rows.filter((img: any) => !img.month_assignment || img.image_type.includes("wildcard"));

      const selected: number[] = [];
      // Take all monthly themes first
      for (const img of monthly) {
        if (selected.length < 12) selected.push(img.id);
      }
      // Fill remaining with wildcards
      for (const img of wildcards) {
        if (selected.length < 12) selected.push(img.id);
      }

      res.json({ selectedImageIds: selected, message: "Here's what we think would look amazing — but this is YOUR calendar! Tap any image to swap it out." });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to curate" });
    }
  });

  // Assign images to months
  app.post("/api/calendar/:id/assign-months", isAuthenticated, async (req: any, res: Response) => {
    try {
      const { assignments } = req.body; // Array of { imageId, month }
      if (!assignments || assignments.length !== 12) {
        return res.status(400).json({ error: "Need exactly 12 month assignments" });
      }

      const projectId = parseInt(req.params.id);
      for (const { imageId, month } of assignments) {
        await pool.query(
          "UPDATE calendar_project_images SET month_assignment = $1 WHERE id = $2 AND calendar_project_id = $3",
          [month, imageId, projectId]
        );
      }

      await pool.query("UPDATE calendar_projects SET status = 'previewing' WHERE id = $1", [projectId]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to assign months" });
    }
  });

  // Set cover
  app.post("/api/calendar/:id/cover", isAuthenticated, async (req: any, res: Response) => {
    try {
      const { coverType, coverImageId } = req.body; // "single" or "collage"
      const projectId = parseInt(req.params.id);
      await pool.query("UPDATE calendar_projects SET cover_type = $1, cover_image_id = $2 WHERE id = $3", [coverType, coverImageId || null, projectId]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to set cover" });
    }
  });

  // Create Stripe checkout for calendar
  app.post("/api/calendar/:id/checkout", isAuthenticated, async (req: any, res: Response) => {
    try {
      if (!isStripeConfigured()) return res.status(503).json({ error: "Stripe not configured" });

      const projectId = parseInt(req.params.id);
      const project = await pool.query("SELECT * FROM calendar_projects WHERE id = $1", [projectId]);
      if (project.rows.length === 0) return res.status(404).json({ error: "Not found" });
      const cal = project.rows[0];

      const stripe = getStripe();
      const baseUrl = process.env.APP_URL || "https://pawtraitcommunities.com";

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: { name: cal.calendar_name || "Custom Pet Calendar" },
            unit_amount: cal.price_cents,
          },
          quantity: 1,
        }],
        metadata: { calendarProjectId: String(projectId) },
        success_url: `${baseUrl}/calendar/${projectId}?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/calendar/${projectId}?canceled=true`,
      });

      await pool.query("UPDATE calendar_projects SET stripe_payment_intent_id = $1 WHERE id = $2", [session.id, projectId]);
      res.json({ checkoutUrl: session.url, sessionId: session.id });
    } catch (err: any) {
      console.error("[calendar] Checkout error:", err.message);
      res.status(500).json({ error: "Failed to create checkout" });
    }
  });

  // Confirm payment and trigger PDF + Gelato
  app.post("/api/calendar/:id/confirm", isAuthenticated, async (req: any, res: Response) => {
    try {
      const { sessionId } = req.body;
      const projectId = parseInt(req.params.id);

      const project = await pool.query("SELECT * FROM calendar_projects WHERE id = $1", [projectId]);
      if (project.rows.length === 0) return res.status(404).json({ error: "Not found" });
      const cal = project.rows[0];

      if (cal.status === "ordered") return res.json({ status: "ordered", alreadyProcessed: true });

      // Verify payment
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== "paid") {
        return res.status(402).json({ error: "Payment not completed" });
      }

      await pool.query("UPDATE calendar_projects SET status = 'ordered' WHERE id = $1", [projectId]);
      res.json({ status: "ordered", projectId });

      // Background: generate PDF and submit to Gelato
      try {
        // Get selected images assigned to months
        const imgs = await pool.query(
          "SELECT * FROM calendar_project_images WHERE calendar_project_id = $1 AND month_assignment IS NOT NULL ORDER BY month_assignment",
          [projectId]
        );
        const monthImages = imgs.rows.map((img: any) => ({ imageUrl: img.image_url, month: img.month_assignment }));

        // Cover
        let coverImage = null;
        if (cal.cover_type === "single" && cal.cover_image_id) {
          const cImg = imgs.rows.find((r: any) => r.id === cal.cover_image_id) ||
            await pool.query("SELECT image_url FROM calendar_project_images WHERE id = $1", [cal.cover_image_id]).then(r => r.rows[0]);
          if (cImg) coverImage = { imageUrl: cImg.image_url, type: "single" };
        } else {
          coverImage = { imageUrl: monthImages[0]?.imageUrl || "", type: "collage" };
        }

        // Get pet name
        const petResult = await pool.query("SELECT name FROM dogs WHERE id = $1", [cal.dog_id]);
        const petName = petResult.rows[0]?.name;

        // Generate PDF
        const pdfBuffer = await generateCalendarPDF(
          monthImages, coverImage, cal.calendar_name || "Custom Pet Calendar",
          cal.calendar_year, cal.start_month || 1, petName
        );

        // Upload PDF to storage
        const pdfName = `calendar-${projectId}-${Date.now()}.pdf`;
        const pdfUrl = await uploadToStorage(
          `data:application/pdf;base64,${pdfBuffer.toString("base64")}`,
          "portraits", pdfName
        );
        await pool.query("UPDATE calendar_projects SET pdf_url = $1 WHERE id = $2", [pdfUrl, projectId]);
        console.log(`[calendar] PDF generated for project ${projectId}: ${pdfUrl}`);

        // Submit to Gelato if configured
        if (isGelatoConfigured() && session.customer_details) {
          const cd = session.customer_details;
          const addr = cd.address || {};
          const nameParts = (cd.name || "").split(" ");
          await createCalendarOrder(
            { firstName: nameParts[0] || "", lastName: nameParts.slice(1).join(" ") || ".", addressLine1: addr.line1 || "", city: addr.city || "", state: addr.state || "", postCode: addr.postal_code || "", country: addr.country || "US", email: cd.email || "" },
            pdfUrl, 26, projectId
          );
        }
      } catch (bgErr: any) {
        console.error(`[calendar] Background PDF/Gelato error for project ${projectId}:`, bgErr.message);
      }
    } catch (err: any) {
      console.error("[calendar] Confirm error:", err.message);
      res.status(500).json({ error: "Failed to confirm order" });
    }
  });

  // List user's calendar projects (save & return)
  app.get("/api/calendar/my-projects", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const resResult = await pool.query("SELECT id FROM residents WHERE supabase_auth_id = $1 AND is_active = true LIMIT 1", [userId]);
      if (resResult.rows.length === 0) return res.json([]);

      const projects = await pool.query(
        "SELECT * FROM calendar_projects WHERE resident_id = $1 ORDER BY created_at DESC",
        [resResult.rows[0].id]
      );
      res.json(projects.rows);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to load calendar projects" });
    }
  });
}
