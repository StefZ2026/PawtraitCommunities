// Stripe client + subscription management for Communities
// Annual subscriptions: Small $499, Medium $799, Large $1199
import Stripe from "stripe";
import { pool } from "./db";
import { storage } from "./storage";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_LIVE_SECRET_KEY;

let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripe) {
    if (!STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY not configured");
    stripe = new Stripe(STRIPE_SECRET_KEY);
  }
  return stripe;
}

export function isStripeConfigured(): boolean {
  return !!STRIPE_SECRET_KEY;
}

// Create or retrieve a Stripe customer for a community
export async function getOrCreateCustomer(orgId: number): Promise<string> {
  const org = await storage.getOrganization(orgId);
  if (!org) throw new Error("Organization not found");

  if (org.stripeCustomerId) return org.stripeCustomerId;

  const s = getStripe();
  const customer = await s.customers.create({
    name: org.name,
    email: org.contactEmail || undefined,
    metadata: { orgId: String(orgId), communityCode: (org as any).communityCode || "" },
  });

  await storage.updateOrganizationStripeInfo(orgId, { stripeCustomerId: customer.id });
  return customer.id;
}

// Create a checkout session for annual subscription
export async function createSubscriptionCheckout(orgId: number, returnUrl: string): Promise<string> {
  const org = await storage.getOrganization(orgId);
  if (!org) throw new Error("Organization not found");
  if (!org.planId) throw new Error("No plan selected");

  const plan = await storage.getSubscriptionPlan(org.planId);
  if (!plan) throw new Error("Plan not found");

  const stripePriceId = plan.stripeLivePriceId || plan.stripePriceId;
  if (!stripePriceId) throw new Error("Stripe price not configured for this plan");

  const customerId = await getOrCreateCustomer(orgId);
  const s = getStripe();

  const session = await s.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: stripePriceId, quantity: 1 }],
    success_url: `${returnUrl}?success=true`,
    cancel_url: `${returnUrl}?canceled=true`,
    metadata: { orgId: String(orgId) },
  });

  return session.url!;
}

// Handle subscription webhook events
export async function handleSubscriptionEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orgId = parseInt(session.metadata?.orgId || "0");
      if (!orgId) return;
      await storage.updateOrganizationStripeInfo(orgId, {
        stripeSubscriptionId: session.subscription as string,
        subscriptionStatus: "active",
      });
      await pool.query("UPDATE organizations SET subscription_start_date = NOW(), subscription_end_date = NOW() + INTERVAL '1 year' WHERE id = $1", [orgId]);
      console.log(`[stripe] Subscription activated for org ${orgId}`);
      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const orgResult = await pool.query("SELECT id FROM organizations WHERE stripe_subscription_id = $1", [sub.id]);
      if (orgResult.rows.length > 0) {
        await storage.updateOrganizationStripeInfo(orgResult.rows[0].id, { subscriptionStatus: sub.status });
      }
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const orgResult = await pool.query("SELECT id FROM organizations WHERE stripe_subscription_id = $1", [sub.id]);
      if (orgResult.rows.length > 0) {
        await storage.updateOrganizationStripeInfo(orgResult.rows[0].id, { subscriptionStatus: "canceled", stripeSubscriptionId: null });
      }
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subId = invoice.subscription as string;
      if (subId) {
        const orgResult = await pool.query("SELECT id FROM organizations WHERE stripe_subscription_id = $1", [subId]);
        if (orgResult.rows.length > 0) {
          await storage.updateOrganizationStripeInfo(orgResult.rows[0].id, { subscriptionStatus: "past_due" });
        }
      }
      break;
    }
  }
}
