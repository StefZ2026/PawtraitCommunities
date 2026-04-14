// SMS notification routes
import type { Express, Response } from "express";
import { isAuthenticated } from "../auth";
import { pool } from "../db";
import { isSmsConfigured, sendSms, notifyPortraitReady } from "../sms";
import { isAdmin } from "./helpers";

export function registerSmsRoutes(app: Express): void {
  // Send portrait notification to a resident
  app.post("/api/sms/notify-portrait", isAuthenticated, isAdmin, async (req: any, res: Response) => {
    try {
      if (!isSmsConfigured()) return res.status(503).json({ error: "SMS not configured" });

      const { residentId, portraitId } = req.body;
      const resResult = await pool.query(
        "SELECT r.phone, r.display_name, o.name as community_name FROM residents r JOIN organizations o ON r.organization_id = o.id WHERE r.id = $1",
        [residentId]
      );
      if (resResult.rows.length === 0) return res.status(404).json({ error: "Resident not found" });
      const { phone, display_name, community_name } = resResult.rows[0];
      if (!phone) return res.status(400).json({ error: "Resident has no phone number" });

      let portraitUrl: string | undefined;
      if (portraitId) {
        const p = await pool.query("SELECT generated_image_url FROM portraits WHERE id = $1", [portraitId]);
        portraitUrl = p.rows[0]?.generated_image_url;
      }

      await notifyPortraitReady(phone, display_name || "Your pet", community_name, portraitUrl);

      await pool.query(
        `INSERT INTO notifications (organization_id, resident_id, channel, recipient_address, message_body, notification_type, status, sent_at)
         SELECT r.organization_id, $1, 'sms', $2, $3, 'portrait_ready', 'sent', NOW()
         FROM residents r WHERE r.id = $1`,
        [residentId, phone, `Portrait ready notification sent to ${phone}`]
      );

      res.json({ success: true });
    } catch (err: any) {
      console.error("[sms] Error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Send bulk notification to all residents in a community
  app.post("/api/sms/notify-community", isAuthenticated, isAdmin, async (req: any, res: Response) => {
    try {
      if (!isSmsConfigured()) return res.status(503).json({ error: "SMS not configured" });

      const { orgId, message } = req.body;
      if (!orgId || !message) return res.status(400).json({ error: "orgId and message required" });

      const residents = await pool.query(
        "SELECT id, phone, display_name FROM residents WHERE organization_id = $1 AND is_active = true AND phone IS NOT NULL",
        [orgId]
      );

      let sent = 0, failed = 0;
      for (const r of residents.rows) {
        const result = await sendSms(r.phone, message);
        if (result.success) sent++;
        else failed++;
      }

      res.json({ sent, failed, total: residents.rows.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}
