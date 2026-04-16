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

  // Send invite email to a resident
  app.post("/api/email/send-invite", isAuthenticated, async (req: any, res: Response) => {
    try {
      const { email, residentName, communityName, communityCode } = req.body;
      if (!email || !communityCode) return res.status(400).json({ error: "Email and community code are required" });

      const joinUrl = `https://pawtraitcommunities.com/join?code=${communityCode}`;

      // Use Supabase auth admin to send email (leverages Supabase's built-in email infrastructure)
      // For now, use a simple fetch to a transactional email API
      // Fallback: use Supabase's invite method
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!supabaseUrl || !supabaseServiceKey) {
        return res.status(503).json({ error: "Email not configured" });
      }

      // Use Supabase Edge Function or direct SMTP — for now, use Supabase's built-in magic link as invite
      // Alternative: Resend API
      // For MVP: use Supabase's auth.admin.inviteUserByEmail which sends a proper email
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Send invite via Supabase auth — this sends an email with a magic link
      const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
        data: { communityCode, communityName, residentName },
        redirectTo: joinUrl,
      });

      if (error) {
        console.error("[email] Supabase invite error:", error.message);
        // If user already exists, just send a notification that they should join
        if (error.message.includes("already been registered")) {
          return res.json({ success: true, note: "User already has an account — they can join directly with the code" });
        }
        return res.status(500).json({ error: "Failed to send invite email" });
      }

      console.log(`[email] Invite sent to ${email} for ${communityCode}`);
      res.json({ success: true });
    } catch (err: any) {
      console.error("[email] Invite error:", err.message);
      res.status(500).json({ error: "Failed to send invite email" });
    }
  });
}
