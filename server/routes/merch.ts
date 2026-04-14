// Merch ordering routes — residents order keepsakes from their portraits
import type { Express, Request, Response } from "express";
import { isAuthenticated } from "../auth";
import { pool } from "../db";
import { storage } from "../storage";
import { isPrintfulConfigured, createOrder as createPrintfulOrder, getOrderStatus as getPrintfulStatus } from "../printful";
import { getProduct, getAllProducts } from "../printful-config";
import { isGelatoConfigured, createCardOrder } from "../gelato";
import { recordMerchEarnings } from "../stripe-connect";

export function registerMerchRoutes(app: Express): void {
  // Get available products
  app.get("/api/merch/products", (_req, res: Response) => {
    res.json(getAllProducts());
  });

  // Create a merch order
  app.post("/api/merch/order", isAuthenticated, async (req: any, res: Response) => {
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

      const variant = variantId
        ? product.variants.find(v => v.id === variantId)
        : product.variants[0];
      if (!variant) return res.status(400).json({ error: "Invalid variant" });

      const qty = quantity || 1;
      const totalCents = variant.retailPriceCents * qty;

      // Create order in our DB
      const orderResult = await pool.query(
        `INSERT INTO merch_orders (organization_id, resident_id, dog_id, portrait_id, customer_name, customer_email,
         shipping_street, shipping_city, shipping_state, shipping_zip, shipping_country,
         fulfillment_provider, total_cents, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'pending')
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

      // Submit to fulfillment provider
      try {
        if (productKey.includes("card") && isGelatoConfigured()) {
          const gelatoOrder = await createCardOrder(
            { firstName: shipping.name.split(" ")[0], lastName: shipping.name.split(" ").slice(1).join(" ") || ".", addressLine1: shipping.street, city: shipping.city, state: shipping.state, postCode: shipping.zip, country: shipping.country || "US", email: shipping.email },
            portrait.generatedImageUrl, "Wishing you well!", "thinking-of-you", qty
          );
          await pool.query("UPDATE merch_orders SET external_order_id = $1, status = 'submitted' WHERE id = $2", [gelatoOrder.id, orderId]);
        } else if (isPrintfulConfigured()) {
          const printfulOrder = await createPrintfulOrder(
            { name: shipping.name, address1: shipping.street, city: shipping.city, state_code: shipping.state, zip: shipping.zip, country_code: shipping.country || "US", email: shipping.email },
            [{ variant_id: variant.id, quantity: qty, files: [{ type: "default", url: portrait.generatedImageUrl }] }],
            true // draft first
          );
          await pool.query("UPDATE merch_orders SET external_order_id = $1, status = 'submitted' WHERE id = $2", [String(printfulOrder.id), orderId]);
        }
      } catch (fulfillErr: any) {
        console.error("[merch] Fulfillment error:", fulfillErr.message);
        await pool.query("UPDATE merch_orders SET status = 'failed', external_status = $1 WHERE id = $2", [fulfillErr.message, orderId]);
      }

      // Record earnings split
      try {
        await recordMerchEarnings(orderId, resident.organization_id, totalCents, variant.wholesaleCostCents * qty);
      } catch {}

      res.status(201).json({ orderId, totalCents, status: "submitted" });
    } catch (err: any) {
      console.error("[merch] Order error:", err.message);
      res.status(500).json({ error: "Failed to create order" });
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
}
