// Stripe subscription + Connect routes
import type { Express, Response } from "express";
import { isAuthenticated } from "../auth";
import { pool } from "../db";
import { storage } from "../storage";
import { isStripeConfigured, createSubscriptionCheckout, handleSubscriptionEvent, getStripe } from "../stripe";
import { createConnectOnboarding, checkConnectStatus } from "../stripe-connect";
import { isAdmin } from "./helpers";

export function registerBillingRoutes(app: Express): void {
  // Create checkout session for community subscription
  app.post("/api/billing/checkout", isAuthenticated, isAdmin, async (req: any, res: Response) => {
    try {
      if (!isStripeConfigured()) return res.status(503).json({ error: "Stripe not configured" });

      const { orgId, billing } = req.body;
      if (!orgId) return res.status(400).json({ error: "orgId required" });

      const returnUrl = `${process.env.APP_URL || "https://pawtraitcommunities.com"}/admin`;
      const checkoutUrl = await createSubscriptionCheckout(orgId, returnUrl, billing === "monthly" ? "monthly" : "annual");
      res.json({ url: checkoutUrl });
    } catch (err: any) {
      console.error("[billing] Checkout error:", err.message);
      res.status(500).json({ error: "Failed to create checkout" });
    }
  });

  // Activate free trial (14 days)
  app.post("/api/billing/free-trial", isAuthenticated, isAdmin, async (req: any, res: Response) => {
    try {
      const { orgId } = req.body;
      if (!orgId) return res.status(400).json({ error: "orgId required" });

      const org = await storage.getOrganization(orgId);
      if (!org) return res.status(404).json({ error: "Community not found" });
      if (org.subscriptionStatus === "active") return res.status(400).json({ error: "Already has an active subscription" });
      if (org.subscriptionStatus === "trial") return res.status(400).json({ error: "Already on a free trial" });

      await pool.query(
        "UPDATE organizations SET subscription_status = 'trial', subscription_start_date = NOW(), subscription_end_date = NOW() + INTERVAL '14 days' WHERE id = $1",
        [orgId]
      );
      console.log(`[billing] Free trial activated for org ${orgId}`);
      res.json({ success: true, status: "trial", expiresIn: "14 days" });
    } catch (err: any) {
      console.error("[billing] Free trial error:", err.message);
      res.status(500).json({ error: "Failed to start trial" });
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
        priceMonthly: (plan as any)?.priceMonthlyCents ? `$${((plan as any).priceMonthlyCents / 100).toFixed(0)}` : null,
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
  app.post("/api/billing/connect-onboarding", isAuthenticated, isAdmin, async (req: any, res: Response) => {
    try {
      const { orgId } = req.body;
      const returnUrl = `${process.env.APP_URL || "https://pawtraitcommunities.com"}/admin`;
      const url = await createConnectOnboarding(orgId, returnUrl);
      res.json({ url });
    } catch (err: any) {
      console.error("[billing] Connect onboarding error:", err.message);
      res.status(500).json({ error: "Failed to start Connect onboarding" });
    }
  });

  // Get all active plans (for wizard pricing display — accessible to any authenticated user)
  app.get("/api/billing/plans", isAuthenticated, async (_req: any, res: Response) => {
    try {
      const plans = await storage.getAllSubscriptionPlans();
      res.json(plans.filter((p: any) => p.isActive).map((p: any) => ({
        id: p.id, name: p.name, description: p.description,
        priceMonthlyCents: p.priceMonthlyCents, priceAnnualCents: p.priceAnnualCents,
        sizeTier: p.sizeTier, maxHomes: p.maxHomes,
      })));
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch plans" });
    }
  });

  // Check Connect status
  app.get("/api/billing/connect-status/:orgId", isAuthenticated, async (req: any, res: Response) => {
    try {
      const orgId = parseInt(req.params.orgId);
      const status = await checkConnectStatus(orgId);
      res.json(status);
    } catch (err: any) {
      console.error("[billing] Connect status error:", err.message);
      res.status(500).json({ error: "Failed to check Connect status" });
    }
  });
}
