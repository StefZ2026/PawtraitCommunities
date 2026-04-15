import type { Express, Request, Response } from "express";
import { pool } from "../db";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import { isAdmin } from "./helpers";
import { uploadToStorage, isDataUri } from "../image-storage";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

function generateCommunityCode(name: string): string {
  const codePart = name.split(/\s+/)[0].toUpperCase().replace(/[^A-Z]/g, "").substring(0, 8);
  const year = new Date().getFullYear().toString().slice(-2);
  return `${codePart}-${year}`;
}

function matchPlan(plans: any[], totalHomes: number, engagementAnswers?: any, overridePlanId?: number | null): any {
  if (overridePlanId) return plans.find((p: any) => p.id === overridePlanId) || null;
  const engagement = engagementAnswers || {};
  const yesCount = [engagement.hasLifestyleDirector, engagement.hasRegularEvents, engagement.hasNewsletterOrPortal].filter(Boolean).length;
  if (yesCount >= 2) return plans.find((p: any) => p.sizeTier === "signature") || null;
  if (totalHomes <= 250) return plans.find((p: any) => p.sizeTier === "standard") || null;
  return plans.find((p: any) => p.sizeTier === "growth") || null;
}

export function registerCommunityRoutes(app: Express): void {

  // Admin: Create community (with engagement-based tier assignment)
  app.post("/api/admin/communities", isAuthenticated, isAdmin, async (req: any, res: Response) => {
    try {
      const { name, slug, totalHomes, contactName, contactEmail, contactPhone,
        locationStreet, locationCity, locationState, locationZip,
        engagementAnswers, selectedPlanId } = req.body;
      if (!name || !slug || !totalHomes) return res.status(400).json({ error: "Name, slug, and total homes are required" });

      const existing = await storage.getOrganizationBySlug(slug);
      if (existing) return res.status(400).json({ error: "This community URL is already taken" });

      const communityCode = generateCommunityCode(name);
      const plans = await storage.getAllSubscriptionPlans();
      const selectedPlan = matchPlan(plans, totalHomes, engagementAnswers, selectedPlanId);
      const planId = selectedPlan?.id || null;

      const org = await storage.createOrganization({
        name, slug, communityCode, totalHomes, contactName: contactName || null, contactEmail: contactEmail || null,
        contactPhone: contactPhone || null, locationStreet: locationStreet || null, locationCity: locationCity || null,
        locationState: locationState || null, locationZip: locationZip || null, planId,
        ownerId: req.user.claims.sub,
        subscriptionStatus: "pending", speciesHandled: "both", onboardingCompleted: true, isActive: true,
      } as any);

      // Auto-register admin as community admin resident
      const userEmail = req.user.claims.email || "";
      try {
        await storage.createResident({
          supabaseAuthId: req.user.claims.sub, organizationId: org.id,
          homeNumber: "MGR", displayName: contactName || "Community Manager",
          email: userEmail, phone: null, role: "admin",
          notificationPreference: "email",
        } as any);
      } catch {}

      res.status(201).json({
        id: org.id, name: org.name, slug: org.slug, communityCode, totalHomes,
        planId, planName: selectedPlan?.name || "No plan",
        priceMonthlyCents: (selectedPlan as any)?.priceMonthlyCents || 0,
        priceAnnualCents: selectedPlan?.priceAnnualCents || 0,
      });
    } catch (error: any) { console.error("Error creating community:", error.message); res.status(500).json({ error: "Failed to create community" }); }
  });

  // Self-service: Register a community (any authenticated user)
  app.post("/api/communities/register-community", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { name, slug, totalHomes, contactName, contactEmail, engagementAnswers } = req.body;
      if (!name || !slug || !totalHomes || !contactName) return res.status(400).json({ error: "Name, slug, total homes, and contact name are required" });

      const existing = await storage.getOrganizationBySlug(slug);
      if (existing) return res.status(400).json({ error: "This community URL is already taken" });

      const communityCode = generateCommunityCode(name);
      const plans = await storage.getAllSubscriptionPlans();
      const selectedPlan = matchPlan(plans, totalHomes, engagementAnswers);
      const planId = selectedPlan?.id || null;

      const org = await storage.createOrganization({
        name, slug, communityCode, totalHomes, contactName, contactEmail: contactEmail || null,
        ownerId: userId, planId, subscriptionStatus: "pending",
        speciesHandled: "both", onboardingCompleted: true, isActive: true,
      } as any);

      // Auto-register owner as community admin resident
      const userEmail = req.user.claims.email || "";
      await storage.createResident({
        supabaseAuthId: userId, organizationId: org.id,
        homeNumber: "MGR", displayName: contactName || "Community Manager",
        email: userEmail, phone: null, role: "admin",
        notificationPreference: "email",
      } as any);

      res.status(201).json({
        id: org.id, name: org.name, slug: org.slug, communityCode, totalHomes,
        planId, planName: selectedPlan?.name || "No plan",
        priceMonthlyCents: (selectedPlan as any)?.priceMonthlyCents || 0,
        priceAnnualCents: selectedPlan?.priceAnnualCents || 0,
      });
    } catch (error: any) { console.error("Error registering community:", error.message); res.status(500).json({ error: "Failed to register community" }); }
  });

  // Community owner dashboard — get the community I own
  app.get("/api/my-community-admin", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      const isAdminUser = userEmail === process.env.ADMIN_EMAIL;
      const requestedOrgId = req.query.orgId;

      // Admin can view any community by orgId
      let orgResult;
      if (requestedOrgId && isAdminUser) {
        orgResult = await pool.query("SELECT * FROM organizations WHERE id = $1 AND is_active = true", [requestedOrgId]);
      } else {
        orgResult = await pool.query("SELECT * FROM organizations WHERE owner_id = $1 AND is_active = true ORDER BY created_at DESC LIMIT 1", [userId]);
        if (orgResult.rows.length === 0 && isAdminUser) {
          orgResult = await pool.query("SELECT * FROM organizations WHERE is_active = true ORDER BY created_at DESC LIMIT 1");
        }
      }
      if (orgResult.rows.length === 0) return res.status(404).json({ error: "No community found" });
      const org = orgResult.rows[0];

      // Get counts
      const [r, d, p] = await Promise.all([
        pool.query("SELECT COUNT(*) as count FROM residents WHERE organization_id = $1 AND is_active = true", [org.id]),
        pool.query("SELECT COUNT(*) as count FROM dogs WHERE organization_id = $1", [org.id]),
        pool.query("SELECT COUNT(*) as count FROM portraits p JOIN dogs d ON p.dog_id = d.id WHERE d.organization_id = $1", [org.id]),
      ]);

      const plan = org.plan_id ? await storage.getSubscriptionPlan(org.plan_id) : null;

      res.json({
        id: org.id, name: org.name, slug: org.slug,
        communityCode: org.community_code, totalHomes: org.total_homes,
        contactName: org.contact_name, contactEmail: org.contact_email,
        subscriptionStatus: org.subscription_status, subscriptionEndDate: org.subscription_end_date,
        planName: plan?.name || null,
        residentCount: Number(r.rows[0]?.count || 0),
        dogCount: Number(d.rows[0]?.count || 0),
        portraitCount: Number(p.rows[0]?.count || 0),
      });
    } catch (error: any) { res.status(500).json({ error: "Failed" }); }
  });

  // Admin: Financial overview
  app.get("/api/admin/financials", isAuthenticated, isAdmin, async (_req: any, res: Response) => {
    try {
      const [merchOrders, merchRevenue, subscriptions] = await Promise.all([
        pool.query("SELECT COUNT(*) as count FROM merch_orders WHERE status != 'canceled'"),
        pool.query("SELECT COALESCE(SUM(total_cents), 0) as total FROM merch_orders WHERE status IN ('paid', 'submitted', 'admin_direct')"),
        pool.query("SELECT subscription_status, COUNT(*) as count FROM organizations WHERE is_active = true GROUP BY subscription_status"),
      ]);

      const subCounts: Record<string, number> = {};
      for (const row of subscriptions.rows) {
        subCounts[row.subscription_status || "pending"] = Number(row.count);
      }

      res.json({
        merchOrderCount: Number(merchOrders.rows[0]?.count || 0),
        merchRevenueCents: Number(merchRevenue.rows[0]?.total || 0),
        subscriptions: subCounts,
      });
    } catch (err: any) {
      console.error("[admin] Financials error:", err.message);
      res.status(500).json({ error: "Failed to load financials" });
    }
  });

  // Admin: Edit community
  app.patch("/api/admin/communities/:id", isAuthenticated, isAdmin, async (req: any, res: Response) => {
    try {
      const orgId = parseInt(req.params.id);
      const { name, slug, totalHomes, contactName, contactEmail, contactPhone, planId } = req.body;
      const updates: string[] = [];
      const values: any[] = [];
      let idx = 1;
      if (name !== undefined) { updates.push(`name = $${idx++}`); values.push(name); }
      if (slug !== undefined) { updates.push(`slug = $${idx++}`); values.push(slug); }
      if (totalHomes !== undefined) { updates.push(`total_homes = $${idx++}`); values.push(totalHomes); }
      if (contactName !== undefined) { updates.push(`contact_name = $${idx++}`); values.push(contactName); }
      if (contactEmail !== undefined) { updates.push(`contact_email = $${idx++}`); values.push(contactEmail); }
      if (contactPhone !== undefined) { updates.push(`contact_phone = $${idx++}`); values.push(contactPhone); }
      if (planId !== undefined) { updates.push(`plan_id = $${idx++}`); values.push(planId); }
      if (updates.length === 0) return res.status(400).json({ error: "Nothing to update" });
      values.push(orgId);
      await pool.query(`UPDATE organizations SET ${updates.join(", ")} WHERE id = $${idx}`, values);
      const org = await storage.getOrganization(orgId);
      res.json(org);
    } catch (error: any) { console.error("Error updating community:", error.message); res.status(500).json({ error: "Failed" }); }
  });

  // Admin: Delete community
  app.delete("/api/admin/communities/:id", isAuthenticated, isAdmin, async (req: any, res: Response) => {
    try {
      const orgId = parseInt(req.params.id);
      const org = await storage.getOrganization(orgId);
      if (!org) return res.status(404).json({ error: "Community not found" });
      await pool.query("DELETE FROM organizations WHERE id = $1", [orgId]);
      console.log(`[admin] Deleted community ${orgId} (${org.name})`);
      res.json({ success: true });
    } catch (error: any) { console.error("Error deleting community:", error.message); res.status(500).json({ error: "Failed" }); }
  });

  // Admin: List communities
  app.get("/api/admin/communities", isAuthenticated, isAdmin, async (req: any, res: Response) => {
    try {
      const orgs = await storage.getAllOrganizations();
      const communities = await Promise.all(orgs.map(async (org) => {
        const [r, d, p] = await Promise.all([
          pool.query("SELECT COUNT(*) as count FROM residents WHERE organization_id = $1 AND is_active = true", [org.id]),
          pool.query("SELECT COUNT(*) as count FROM dogs WHERE organization_id = $1", [org.id]),
          pool.query("SELECT COUNT(*) as count FROM portraits p JOIN dogs d ON p.dog_id = d.id WHERE d.organization_id = $1", [org.id]),
        ]);
        const plan = org.planId ? await storage.getSubscriptionPlan(org.planId) : null;
        return { ...org, planName: plan?.name || null, residentCount: Number(r.rows[0]?.count || 0), dogCount: Number(d.rows[0]?.count || 0), portraitCount: Number(p.rows[0]?.count || 0) };
      }));
      res.json(communities);
    } catch (error: any) { console.error("Error listing communities:", error.message); res.status(500).json({ error: "Failed" }); }
  });

  // Public: Validate community code
  app.post("/api/communities/validate-code", async (req: Request, res: Response) => {
    try {
      const { code } = req.body;
      if (!code) return res.status(400).json({ error: "Community code is required" });
      const org = await storage.getOrganizationByCommunityCode(code.trim().toUpperCase());
      if (!org) return res.json({ valid: false, error: "Invalid community code." });
      res.json({ valid: true, communityId: org.id, communityName: org.name, logoUrl: org.logoUrl });
    } catch (error: any) { res.status(500).json({ error: "Validation failed" }); }
  });

  // Resident: Register
  app.post("/api/communities/register", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email || "";
      const { communityCode, homeNumber, displayName, phone } = req.body;
      if (!communityCode || !homeNumber) return res.status(400).json({ error: "Community code and home number are required" });
      const org = await storage.getOrganizationByCommunityCode(communityCode.trim().toUpperCase());
      if (!org) return res.status(400).json({ error: "Invalid community code" });
      const existing = await storage.getResidentByAuthId(userId, org.id);
      if (existing) return res.status(400).json({ error: "Already registered in this community" });
      const resident = await storage.createResident({ supabaseAuthId: userId, organizationId: org.id, homeNumber: homeNumber.trim(), displayName: displayName || null, email: userEmail, phone: phone || null, role: "resident", notificationPreference: "email" });
      res.status(201).json({ residentId: resident.id, communityId: org.id, communityName: org.name, communitySlug: org.slug, homeNumber: resident.homeNumber });
    } catch (error: any) { console.error("Error registering:", error.message); res.status(500).json({ error: "Registration failed" }); }
  });

  // Resident: My community
  app.get("/api/my-community", isAuthenticated, async (req: any, res: Response) => {
    try {
      const result = await pool.query(
        "SELECT r.*, o.name as community_name, o.slug, o.logo_url, o.description FROM residents r JOIN organizations o ON r.organization_id = o.id WHERE r.supabase_auth_id = $1 AND r.is_active = true LIMIT 1",
        [req.user.claims.sub]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: "Not registered" });
      const row = result.rows[0];
      res.json({ residentId: row.id, communityId: row.organization_id, communityName: row.community_name, communitySlug: row.slug, logoUrl: row.logo_url, homeNumber: row.home_number, displayName: row.display_name, role: row.role });
    } catch (error: any) { res.status(500).json({ error: "Failed" }); }
  });

  // Resident: My pets
  app.get("/api/my-pets", isAuthenticated, async (req: any, res: Response) => {
    try {
      const resResult = await pool.query("SELECT id, organization_id FROM residents WHERE supabase_auth_id = $1 AND is_active = true LIMIT 1", [req.user.claims.sub]);
      if (resResult.rows.length === 0) return res.status(404).json({ error: "Not registered" });
      const dogsResult = await pool.query(
        `SELECT d.*, (SELECT json_build_object('id', p.id, 'generatedImageUrl', p.generated_image_url, 'styleId', p.style_id, 'likeCount', p.like_count, 'createdAt', p.created_at) FROM portraits p WHERE p.dog_id = d.id ORDER BY p.created_at DESC LIMIT 1) as portrait FROM dogs d WHERE d.resident_id = $1 AND d.is_available = true ORDER BY d.created_at DESC`,
        [resResult.rows[0].id]
      );
      res.json(dogsResult.rows);
    } catch (error: any) { res.status(500).json({ error: "Failed" }); }
  });

  // Resident: Add pet
  app.post("/api/my-pets", isAuthenticated, async (req: any, res: Response) => {
    try {
      const { name, species, breed, age, description, originalPhotoUrl } = req.body;
      if (!name) return res.status(400).json({ error: "Pet name is required" });
      const resResult = await pool.query("SELECT id, organization_id FROM residents WHERE supabase_auth_id = $1 AND is_active = true LIMIT 1", [req.user.claims.sub]);
      if (resResult.rows.length === 0) return res.status(404).json({ error: "Not registered" });
      const resident = resResult.rows[0];

      // Upload photo to Supabase Storage instead of storing base64 in DB
      let photoUrl = originalPhotoUrl || null;
      if (photoUrl && isDataUri(photoUrl)) {
        const fname = `pet-${resident.id}-${Date.now()}.jpg`;
        photoUrl = await uploadToStorage(photoUrl, "originals", fname);
      }

      const dog = await storage.createDog({ organizationId: resident.organization_id, residentId: resident.id, name, species: species || "dog", breed: breed || null, age: age || null, description: description || null, originalPhotoUrl: photoUrl } as any);
      res.status(201).json(dog);
    } catch (error: any) { console.error("Error adding pet:", error.message); res.status(500).json({ error: "Failed to add pet" }); }
  });

  // Gallery
  app.get("/api/communities/:slug/gallery", async (req: Request, res: Response) => {
    try {
      const org = await storage.getOrganizationBySlug(req.params.slug);
      if (!org) return res.status(404).json({ error: "Community not found" });
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const offset = parseInt(req.query.offset as string) || 0;
      const sort = (req.query.sort as string) || "likes";
      const orderBy = sort === "newest" ? "p.created_at DESC" : "p.like_count DESC, p.created_at DESC";
      const result = await pool.query(
        `SELECT p.id, p.dog_id, p.style_id, p.generated_image_url, p.like_count, p.created_at, d.name as dog_name, d.species, d.breed, r.display_name as owner_name, ps.name as style_name
         FROM portraits p JOIN dogs d ON p.dog_id = d.id LEFT JOIN residents r ON d.resident_id = r.id LEFT JOIN portrait_styles ps ON p.style_id = ps.id
         WHERE d.organization_id = $1 AND p.opt_out_gallery = false AND p.generated_image_url IS NOT NULL ORDER BY ${orderBy} LIMIT $2 OFFSET $3`,
        [org.id, limit, offset]
      );
      res.json({ communityName: org.name, logoUrl: org.logoUrl, portraits: result.rows, total: result.rows.length });
    } catch (error: any) { res.status(500).json({ error: "Failed" }); }
  });

  // Like/unlike
  app.post("/api/portraits/:id/like", isAuthenticated, async (req: any, res: Response) => {
    try {
      const portraitId = parseInt(req.params.id);
      const resResult = await pool.query("SELECT id FROM residents WHERE supabase_auth_id = $1 AND is_active = true LIMIT 1", [req.user.claims.sub]);
      if (resResult.rows.length === 0) return res.status(403).json({ error: "Must be registered" });
      const residentId = resResult.rows[0].id;
      const existing = await pool.query("SELECT id FROM portrait_likes WHERE portrait_id = $1 AND resident_id = $2", [portraitId, residentId]);
      if (existing.rows.length > 0) { await storage.unlikePortrait(portraitId, residentId); res.json({ liked: false }); }
      else { await storage.likePortrait(portraitId, residentId); res.json({ liked: true }); }
    } catch (error: any) { res.status(500).json({ error: "Failed" }); }
  });

  // My likes
  app.get("/api/my-likes", isAuthenticated, async (req: any, res: Response) => {
    try {
      const resResult = await pool.query("SELECT id FROM residents WHERE supabase_auth_id = $1 AND is_active = true LIMIT 1", [req.user.claims.sub]);
      if (resResult.rows.length === 0) return res.json({ likedPortraitIds: [] });
      const ids = await storage.getPortraitLikesByResident(resResult.rows[0].id);
      res.json({ likedPortraitIds: ids });
    } catch (error: any) { res.status(500).json({ error: "Failed" }); }
  });

  // Opt-out
  app.patch("/api/portraits/:id/opt-out", isAuthenticated, async (req: any, res: Response) => {
    try {
      const portraitId = parseInt(req.params.id);
      const { optOut } = req.body;
      const result = await pool.query("SELECT p.id FROM portraits p JOIN dogs d ON p.dog_id = d.id JOIN residents r ON d.resident_id = r.id WHERE p.id = $1 AND r.supabase_auth_id = $2", [portraitId, req.user.claims.sub]);
      if (result.rows.length === 0) return res.status(403).json({ error: "Not your portrait" });
      await storage.updatePortrait(portraitId, { optOutGallery: !!optOut } as any);
      res.json({ success: true });
    } catch (error: any) { res.status(500).json({ error: "Failed" }); }
  });

  // Community dashboard
  app.get("/api/community-dashboard/:slug", isAuthenticated, async (req: any, res: Response) => {
    try {
      const org = await storage.getOrganizationBySlug(req.params.slug);
      if (!org) return res.status(404).json({ error: "Not found" });
      const isAdmin = req.user.claims.email === ADMIN_EMAIL;
      if (!isAdmin) {
        const r = await pool.query("SELECT role FROM residents WHERE supabase_auth_id = $1 AND organization_id = $2 AND is_active = true", [req.user.claims.sub, org.id]);
        if (r.rows.length === 0 || r.rows[0].role !== "admin") return res.status(403).json({ error: "Access denied" });
      }
      const [rc, dc, pc] = await Promise.all([
        pool.query("SELECT COUNT(*) as count FROM residents WHERE organization_id = $1 AND is_active = true", [org.id]),
        pool.query("SELECT COUNT(*) as count FROM dogs WHERE organization_id = $1", [org.id]),
        pool.query("SELECT COUNT(*) as count FROM portraits p JOIN dogs d ON p.dog_id = d.id WHERE d.organization_id = $1", [org.id]),
      ]);
      res.json({ community: { id: org.id, name: org.name, slug: org.slug, totalHomes: (org as any).totalHomes, subscriptionStatus: org.subscriptionStatus },
        stats: { residents: Number(rc.rows[0]?.count || 0), pets: Number(dc.rows[0]?.count || 0), portraits: Number(pc.rows[0]?.count || 0) } });
    } catch (error: any) { res.status(500).json({ error: "Failed" }); }
  });
}
