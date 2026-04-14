import type { Express, Response } from "express";
import { pool } from "../db";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import { generatePortrait } from "../portrait-engine";
import { enqueue, getJob, registerWorker } from "../job-queue";
import { uploadToStorage, isDataUri } from "../image-storage";
import rateLimit from "express-rate-limit";

const aiLimiter = rateLimit({
  windowMs: 60 * 1000, max: 10,
  message: { error: "Too many portrait requests. Please wait a minute." },
  keyGenerator: (req: any) => req.user?.claims?.sub || "anon",
});

export function registerPortraitRoutes(app: Express): void {

  // Register the worker that processes portrait generation jobs
  registerWorker(async (job) => {
    const { dogId, styleId, originalPhotoUrl } = job.payload;
    const style = await storage.getPortraitStyle(styleId);
    if (!style) throw new Error("Style not found");
    const dog = await storage.getDog(dogId);
    if (!dog) throw new Error("Dog not found");

    const prompt = style.promptTemplate.replace(/\{breed\}/g, dog.breed || dog.species || "dog");
    const imageUrl = await generatePortrait(prompt, originalPhotoUrl);

    // Upload to Supabase Storage if it's a data URI or external URL
    let finalUrl = imageUrl;
    if (isDataUri(imageUrl)) {
      const fname = `portrait-${dogId}-${styleId}-${Date.now()}.png`;
      finalUrl = await uploadToStorage(imageUrl, "portraits", fname);
    }

    // Create or update portrait record
    const existing = await storage.getPortraitByDogAndStyle(dogId, styleId);
    if (existing) {
      await storage.updatePortrait(existing.id, { generatedImageUrl: finalUrl, previousImageUrl: existing.generatedImageUrl } as any);
      return { portraitId: existing.id, imageUrl: finalUrl };
    } else {
      const portrait = await storage.createPortrait({ dogId, styleId, generatedImageUrl: finalUrl } as any);
      return { portraitId: portrait.id, imageUrl: finalUrl };
    }
  });

  // POST /api/generate-portrait — resident generates a portrait for their pet
  app.post("/api/generate-portrait", isAuthenticated, aiLimiter, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { dogId, styleId } = req.body;

      if (!dogId || !styleId) return res.status(400).json({ error: "dogId and styleId are required" });

      // Verify resident owns the dog
      const resResult = await pool.query("SELECT id FROM residents WHERE supabase_auth_id = $1 AND is_active = true LIMIT 1", [userId]);
      if (resResult.rows.length === 0) return res.status(403).json({ error: "Must be a registered resident" });
      const residentId = resResult.rows[0].id;

      const dog = await storage.getDog(dogId);
      if (!dog) return res.status(404).json({ error: "Dog not found" });
      if (dog.residentId !== residentId) return res.status(403).json({ error: "This is not your pet" });

      const style = await storage.getPortraitStyle(styleId);
      if (!style) return res.status(404).json({ error: "Style not found" });

      // Enqueue the job
      const jobId = enqueue("portrait", { dogId, styleId, originalPhotoUrl: dog.originalPhotoUrl });
      res.json({ jobId, message: "Portrait generation started" });
    } catch (error: any) {
      console.error("Error starting portrait generation:", error.message);
      res.status(500).json({ error: "Failed to start generation" });
    }
  });

  // GET /api/jobs/:id — check job status
  app.get("/api/jobs/:id", isAuthenticated, async (req: any, res: Response) => {
    const job = getJob(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json({ id: job.id, status: job.status, progress: job.progress, total: job.total, result: job.result, error: job.error });
  });

  // GET /api/portrait-styles — list all styles
  app.get("/api/portrait-styles", async (_req, res: Response) => {
    try {
      const styles = await storage.getAllPortraitStyles();
      res.json(styles);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch styles" });
    }
  });
}
