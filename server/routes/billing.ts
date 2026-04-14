// Stripe subscription + Connect routes
import type { Express, Response } from "express";
import { isAuthenticated } from "../auth";
import { pool } from "../db";
import { storage } from "../storage";
import { isStripeConfigured, createSubscriptionCheckout, handleSubscriptionEvent, getStripe } from "../stripe";
import { createConnectOnboarding, checkConnectStatus } from "../stripe-connect";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

export function registerBillingRoutes(app: Express): void {
  // Create checkout session for community subscription
  app.post("/api/billing/checkout", isAuthenticated, async (req: any, res: Response) => {
    try {
      if (req.user.claims.email !== ADMIN_EMAIL) return res.status(403).json({ error: "Admin only" });
      if (!isStripeConfigured()) return res.status(503).json({ error: "Stripe not configured" });

      const { orgId } = req.body;
      if (!orgId) return res.status(400).json({ error: "orgId required" });

      const returnUrl = `${process.env.APP_URL || "https://pawtrait-communities.onrender.com"}/admin`;
      const checkoutUrl = await createSubscriptionCheckout(orgId, returnUrl);
      res.json({ url: checkoutUrl });
    } catch (err: any) {
      console.error("[billing] Checkout error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Get subscription status for a community
  app.get("/api/billing/status/:orgId", isAuthenticated, async (req: any, res: Response) => {
    try {
      const orgId = parseInt(req.params.orgId);
      const org = await storage.getOrganization(orgId);
      if (!org) return res.status(404).json({ error: "Not found" });

      const plan = org.planId ? await storage.getSubscriptionPlan(org.planId) : null;
      res.json({
        subscriptionStatus: org.subscriptionStatus,
        planName: plan?.name || "None",
        priceAnnual: plan?.priceAnnualCents ? `$${(plan.priceAnnualCents / 100).toFixed(0)}` : null,
        startDate: (org as any).subscriptionStartDate,
        endDate: (org as any).subscriptionEndDate,
        hasConnect: !!org.stripeConnectAccountId,
        connectReady: !!org.stripeConnectOnboardingComplete,
      });
    } catch (err: any) {
      res.status(500).json({ error: "Failed" });
    }
  });

  // Start Stripe Connect onboarding for a community
  app.post("/api/billing/connect-onboarding", isAuthenticated, async (req: any, res: Response) => {
    try {
      if (req.user.claims.email !== ADMIN_EMAIL) return res.status(403).json({ error: "Admin only" });
      const { orgId } = req.body;
      const returnUrl = `${process.env.APP_URL || "https://pawtrait-communities.onrender.com"}/admin`;
      const url = await createConnectOnboarding(orgId, returnUrl);
      res.json({ url });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Check Connect status
  app.get("/api/billing/connect-status/:orgId", isAuthenticated, async (req: any, res: Response) => {
    try {
      const orgId = parseInt(req.params.orgId);
      const status = await checkConnectStatus(orgId);
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}
