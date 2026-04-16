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
      res.status(500).json({ error: "Failed to send notification" });
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
      console.error("[sms] Broadcast error:", err.message);
      res.status(500).json({ error: "Failed to send broadcast" });
    }
  });

  // Send invite SMS to a resident
  app.post("/api/sms/send-invite", isAuthenticated, async (req: any, res: Response) => {
    try {
      if (!isSmsConfigured()) return res.status(503).json({ error: "SMS not configured" });
      const { phone, residentName, communityName, communityCode } = req.body;
      if (!phone || !communityCode) return res.status(400).json({ error: "Phone and community code are required" });

      const message = `Hi${residentName ? ` ${residentName}` : ''}! You're invited to join ${communityName || 'your community'} on Pawtrait Communities! Get a free AI portrait of your pet in 50+ stunning styles. Join here: https://pawtraitcommunities.com/join?code=${communityCode}`;

      const result = await sendSms(phone, message);
      if (result.success) {
        console.log(`[sms] Invite sent to ${phone} for ${communityCode}`);
        res.json({ success: true, messageId: result.messageId });
      } else {
        res.status(500).json({ error: "Failed to send invite" });
      }
    } catch (err: any) {
      console.error("[sms] Invite error:", err.message);
      res.status(500).json({ error: "Failed to send invite" });
    }
  });

  // Send invite email to a resident via Resend
  app.post("/api/email/send-invite", isAuthenticated, async (req: any, res: Response) => {
    try {
      const { email, residentName, communityName, communityCode } = req.body;
      if (!email || !communityCode) return res.status(400).json({ error: "Email and community code are required" });

      const RESEND_KEY = process.env.RESEND_API_KEY;
      if (!RESEND_KEY) return res.status(503).json({ error: "Email not configured" });

      const joinUrl = `https://pawtraitcommunities.com/join?code=${communityCode}`;

      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: `${communityName || "Pawtrait Communities"} <noreply@pawtraitcommunities.com>`,
          to: [email],
          subject: `You're invited to join ${communityName || "your community"} on Pawtrait Communities!`,
          html: `
            <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 30px; background: #FFFAF5;">
              <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #E8751E; font-size: 28px; margin: 0;">Pawtrait Communities</h1>
                <h2 style="font-size: 22px; margin: 8px 0 0 0;">${communityName || "Your Community"}</h2>
              </div>
              <p style="font-size: 16px; color: #333;">Hi${residentName ? ` ${residentName}` : ""}!</p>
              <p style="font-size: 16px; color: #333;">You're invited to join <strong>${communityName}</strong> on Pawtrait Communities! Get a free AI portrait of your pet in 50+ stunning styles.</p>
              <div style="background: #FFF3E0; padding: 20px; border-radius: 12px; text-align: center; margin: 24px 0;">
                <p style="font-size: 14px; color: #666; margin: 0 0 8px 0;">Your community code:</p>
                <p style="font-size: 36px; font-family: monospace; color: #E8751E; font-weight: bold; letter-spacing: 4px; margin: 0;">${communityCode}</p>
              </div>
              <div style="text-align: center; margin: 24px 0;">
                <a href="${joinUrl}" style="display: inline-block; background: #E8751E; color: white; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-size: 18px; font-weight: bold;">Join Now</a>
              </div>
              <p style="font-size: 14px; color: #666; text-align: center;">Or go to <strong>pawtraitcommunities.com/join</strong> and enter the code above.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
              <p style="font-size: 12px; color: #999; text-align: center;">pawtraitcommunities.com</p>
            </div>
          `,
        }),
      });

      const emailData = await emailRes.json();
      if (!emailRes.ok) {
        console.error("[email] Resend error:", JSON.stringify(emailData));
        return res.status(500).json({ error: "Failed to send invite email" });
      }

      console.log(`[email] Invite sent to ${email} for ${communityCode} via Resend`);
      res.json({ success: true });
    } catch (err: any) {
      console.error("[email] Invite error:", err.message);
      res.status(500).json({ error: "Failed to send invite email" });
    }
  });
}
