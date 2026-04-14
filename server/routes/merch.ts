// Merch ordering routes — residents order keepsakes from their portraits
// Two-step flow: checkout (create order + Stripe session) → confirm (verify payment + submit to fulfillment)
import type { Express, Request, Response } from "express";
import { isAuthenticated } from "../auth";
import { pool } from "../db";
import { storage } from "../storage";
import { isPrintfulConfigured, createOrder as createPrintfulOrder } from "../printful";
import { getProduct, getAllProducts } from "../printful-config";
import { isGelatoConfigured, createCardOrder } from "../gelato";
import { recordMerchEarnings } from "../stripe-connect";
import { isStripeConfigured, getStripe } from "../stripe";
import rateLimit from "express-rate-limit";

const confirmLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, keyGenerator: () => "global" });

export function registerMerchRoutes(app: Express): void {
  // Get available products
  app.get("/api/merch/products", (_req, res: Response) => {
    res.json(getAllProducts());
  });

  // Step 1: Create order + Stripe Checkout session
  app.post("/api/merch/checkout", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { portraitId, productKey, variantId, quantity, shipping } = req.body;

      if (!portraitId || !productKey || !shipping) {
        return res.status(400).json({ error: "portraitId, productKey, and shipping are required" });
      }

      // Get resident
      const resResult = await pool.query("SELECT id, organization_id FROM residents WHERE supabase_auth_id = $1 AND is_active = true LIMIT 1", [userId]);
      if (resResult.rows.length === 0) return res.status(403).json({ error: "Must be registered" });
      const resident = resResult.rows[0];

      // Get portrait
      const portrait = await storage.getPortrait(portraitId);
      if (!portrait?.generatedImageUrl) return res.status(400).json({ error: "Portrait not found or not generated" });

      // Get product config
      const product = getProduct(productKey);
      if (!product) return res.status(400).json({ error: "Invalid product" });

      const variant = variantId ? product.variants.find(v => v.id === variantId) : product.variants[0];
      if (!variant) return res.status(400).json({ error: "Invalid variant" });

      const qty = quantity || 1;
      const totalCents = variant.retailPriceCents * qty;

      // Create order in DB as awaiting_payment
      const orderResult = await pool.query(
        `INSERT INTO merch_orders (organization_id, resident_id, dog_id, portrait_id, customer_name, customer_email,
         shipping_street, shipping_city, shipping_state, shipping_zip, shipping_country,
         fulfillment_provider, total_cents, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'awaiting_payment')
         RETURNING id`,
        [resident.organization_id, resident.id, portrait.dogId, portraitId,
         shipping.name, shipping.email || null,
         shipping.street, shipping.city, shipping.state, shipping.zip, shipping.country || "US",
         productKey.includes("card") ? "gelato" : "printful", totalCents]
      );
      const orderId = orderResult.rows[0].id;

      // Create order item
      await pool.query(
        `INSERT INTO merch_order_items (order_id, product_key, variant_id, quantity, price_cents, wholesale_cost_cents, artwork_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [orderId, productKey, variant.id, qty, variant.retailPriceCents, variant.wholesaleCostCents, portrait.generatedImageUrl]
      );

      // Create Stripe Checkout session
      if (!isStripeConfigured()) {
        return res.status(503).json({ error: "Stripe not configured — cannot process payments" });
      }

      const stripe = getStripe();
      const baseUrl = process.env.APP_URL || "https://pawtraitcommunities.com";

      const stripeCustomer = await stripe.customers.create({
        name: shipping.name,
        email: shipping.email || undefined,
        address: {
          line1: shipping.street, city: shipping.city, state: shipping.state,
          postal_code: shipping.zip, country: shipping.country || "US",
        },
        shipping: {
          name: shipping.name,
          address: {
            line1: shipping.street, city: shipping.city, state: shipping.state,
            postal_code: shipping.zip, country: shipping.country || "US",
          },
        },
      });

      const checkoutSession = await stripe.checkout.sessions.create({
        mode: "payment",
        customer: stripeCustomer.id,
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: { name: `${product.name}${variant.name ? ` — ${variant.name}` : ""}` },
            unit_amount: variant.retailPriceCents,
          },
          quantity: qty,
        }],
        payment_intent_data: { statement_descriptor: "PAWTRAIT MERCH" },
        metadata: { merchOrderId: String(orderId), orgId: String(resident.organization_id) },
        success_url: `${baseUrl}/order/${portraitId}?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/order/${portraitId}?canceled=true`,
      });

      // Store session ID on order
      await pool.query("UPDATE merch_orders SET stripe_payment_intent_id = $1 WHERE id = $2", [checkoutSession.id, orderId]);

      res.json({ checkoutUrl: checkoutSession.url, orderId, sessionId: checkoutSession.id, totalCents });
    } catch (err: any) {
      console.error("[merch] Checkout error:", err.message);
      res.status(500).json({ error: "Failed to create checkout" });
    }
  });

  // Step 2: Confirm payment and submit to fulfillment
  app.post("/api/merch/confirm-checkout", confirmLimiter, async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.body;
      if (!sessionId) return res.status(400).json({ error: "Session ID is required" });

      const orderResult = await pool.query("SELECT * FROM merch_orders WHERE stripe_payment_intent_id = $1", [sessionId]);
      if (orderResult.rows.length === 0) return res.status(404).json({ error: "Order not found" });
      const order = orderResult.rows[0];

      // Already processed
      if (order.status !== "awaiting_payment") {
        return res.json({ orderId: order.id, status: order.status, totalCents: order.total_cents, alreadyProcessed: true });
      }

      // Verify payment with Stripe
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== "paid") {
        return res.status(402).json({ error: "Payment not completed", paymentStatus: session.payment_status });
      }

      // Update with actual amounts (tax may differ)
      const actualTotalCents = session.amount_total || order.total_cents;
      const taxCents = (session as any).total_details?.amount_tax || 0;
      await pool.query("UPDATE merch_orders SET status = 'paid', total_cents = $1, tax_cents = $2 WHERE id = $3", [actualTotalCents, taxCents, order.id]);

      // Get order items for fulfillment
      const itemsResult = await pool.query("SELECT * FROM merch_order_items WHERE order_id = $1", [order.id]);
      const items = itemsResult.rows;

      // Submit to fulfillment
      try {
        if (order.fulfillment_provider === "gelato" && isGelatoConfigured()) {
          const gelatoOrder = await createCardOrder(
            { firstName: order.customer_name.split(" ")[0], lastName: order.customer_name.split(" ").slice(1).join(" ") || ".", addressLine1: order.shipping_street, city: order.shipping_city, state: order.shipping_state, postCode: order.shipping_zip, country: order.shipping_country || "US", email: order.customer_email },
            items[0]?.artwork_url, "Wishing you well!", "thinking-of-you", items[0]?.quantity || 1
          );
          await pool.query("UPDATE merch_orders SET external_order_id = $1, status = 'submitted' WHERE id = $2", [gelatoOrder.id, order.id]);
        } else if (isPrintfulConfigured()) {
          const printfulItems = items.map((item: any) => ({
            variant_id: item.variant_id,
            quantity: item.quantity,
            files: [{ type: "default", url: item.artwork_url }],
          }));
          const printfulOrder = await createPrintfulOrder(
            { name: order.customer_name, address1: order.shipping_street, city: order.shipping_city, state_code: order.shipping_state, zip: order.shipping_zip, country_code: order.shipping_country || "US", email: order.customer_email },
            printfulItems, true
          );
          await pool.query("UPDATE merch_orders SET external_order_id = $1, status = 'submitted' WHERE id = $2", [String(printfulOrder.id), order.id]);
        }
      } catch (fulfillErr: any) {
        console.error("[merch] Fulfillment error:", fulfillErr.message);
        await pool.query("UPDATE merch_orders SET status = 'paid_pending_fulfillment', external_status = $1 WHERE id = $2", [fulfillErr.message, order.id]);
      }

      // Record earnings split
      try {
        const wholesaleCents = items.reduce((sum: number, i: any) => sum + ((i.wholesale_cost_cents || 0) * (i.quantity || 1)), 0);
        await recordMerchEarnings(order.id, order.organization_id, actualTotalCents, wholesaleCents);
      } catch {}

      const updatedOrder = await pool.query("SELECT status, external_order_id FROM merch_orders WHERE id = $1", [order.id]);
      res.json({ orderId: order.id, status: updatedOrder.rows[0]?.status || "paid", totalCents: actualTotalCents });
    } catch (err: any) {
      console.error("[merch] Confirm error:", err.message);
      res.status(500).json({ error: "Failed to confirm order" });
    }
  });

  // Cancel abandoned order
  app.delete("/api/merch/order/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const orderId = parseInt(req.params.id);
      const order = await pool.query("SELECT id, status FROM merch_orders WHERE id = $1", [orderId]);
      if (order.rows.length === 0) return res.status(404).json({ error: "Order not found" });
      if (order.rows[0].status !== "awaiting_payment") return res.status(400).json({ error: "Cannot cancel — order already processed" });
      await pool.query("DELETE FROM merch_order_items WHERE order_id = $1", [orderId]);
      await pool.query("DELETE FROM merch_orders WHERE id = $1", [orderId]);
      res.json({ deleted: true });
    } catch (err: any) {
      res.status(500).json({ error: "Failed" });
    }
  });

  // Get resident's order history
  app.get("/api/merch/orders", isAuthenticated, async (req: any, res: Response) => {
    try {
      const resResult = await pool.query("SELECT id FROM residents WHERE supabase_auth_id = $1 AND is_active = true LIMIT 1", [req.user.claims.sub]);
      if (resResult.rows.length === 0) return res.json([]);
      const orders = await pool.query(
        `SELECT mo.*, json_agg(json_build_object('productKey', moi.product_key, 'quantity', moi.quantity, 'priceCents', moi.price_cents)) as items
         FROM merch_orders mo LEFT JOIN merch_order_items moi ON mo.id = moi.order_id
         WHERE mo.resident_id = $1 GROUP BY mo.id ORDER BY mo.created_at DESC`,
        [resResult.rows[0].id]
      );
      res.json(orders.rows);
    } catch (err: any) {
      res.status(500).json({ error: "Failed" });
    }
  });

  // Legacy endpoint — redirect to checkout flow
  app.post("/api/merch/order", isAuthenticated, async (req: any, res: Response) => {
    res.status(400).json({ error: "Use /api/merch/checkout instead. Payment is required before fulfillment." });
  });
}
