import type { Express } from "express";
import { type Server } from "http";
import rateLimit from "express-rate-limit";
import { registerAuthRoutes } from "./auth";
import { registerCommunityRoutes } from "./routes/communities";
import { registerPortraitRoutes } from "./routes/portraits";
import { registerBillingRoutes } from "./routes/billing";
import { registerMerchRoutes } from "./routes/merch";
import { registerSmsRoutes } from "./routes/sms";

const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, max: 600,
  message: { error: "Too many requests." },
  standardHeaders: true, legacyHeaders: false,
  keyGenerator: (req: any) => req.user?.claims?.sub || "anon",
  validate: { xForwardedForHeader: false },
});

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  registerAuthRoutes(app);
  app.use("/api/", apiRateLimiter);
  registerCommunityRoutes(app);
  registerPortraitRoutes(app);
  registerBillingRoutes(app);
  registerMerchRoutes(app);
  registerSmsRoutes(app);
  return httpServer;
}
