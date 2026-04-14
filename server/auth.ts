import { createClient } from "@supabase/supabase-js";
import type { Express, RequestHandler } from "express";
import rateLimit from "express-rate-limit";
import { pool } from "./db";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const recentUsers = new Map<string, number>();
const CACHE_TTL = 5 * 60 * 1000;

export const isAuthenticated: RequestHandler = async (req: any, res, next) => {
  const authHeader = req.headers.authorization;
  let token: string | undefined;
  if (authHeader?.startsWith("Bearer ")) token = authHeader.substring(7);
  else if (req.query.token) token = req.query.token as string;

  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ message: "Unauthorized" });

    req.user = { claims: { sub: user.id, email: user.email }, access_token: token };

    const now = Date.now();
    const lastSeen = recentUsers.get(user.id);
    if (!lastSeen || now - lastSeen > CACHE_TTL) {
      try {
        await pool.query(
          `INSERT INTO users (id, email, first_name, last_name, profile_image_url) VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO UPDATE SET email = COALESCE(EXCLUDED.email, users.email), first_name = COALESCE(EXCLUDED.first_name, users.first_name),
           last_name = COALESCE(EXCLUDED.last_name, users.last_name), profile_image_url = COALESCE(EXCLUDED.profile_image_url, users.profile_image_url), updated_at = NOW()`,
          [user.id, user.email || null, user.user_metadata?.first_name || user.user_metadata?.full_name?.split(" ")[0] || null,
           user.user_metadata?.last_name || user.user_metadata?.full_name?.split(" ").slice(1).join(" ") || null, user.user_metadata?.avatar_url || null]
        );
      } catch (upsertErr) { console.error("[auth] User upsert failed:", upsertErr); }
      recentUsers.set(user.id, now);
    }
    return next();
  } catch { return res.status(401).json({ message: "Unauthorized" }); }
};

export function registerAuthRoutes(app: Express): void {
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      const result = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
      const user = result.rows[0] || null;
      const isAdmin = userEmail === process.env.ADMIN_EMAIL;
      res.json({ ...user, isAdmin });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  const signupLimiter = rateLimit({ windowMs: 60 * 1000, max: 5, message: { error: "Too many signup attempts." }, standardHeaders: true, legacyHeaders: false });

  app.post("/api/auth/signup", signupLimiter, async (req, res) => {
    try {
      const { email, password, firstName, lastName, acceptedTerms } = req.body;
      if (!email || !password) return res.status(400).json({ error: "Email and password are required" });
      if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
      if (!acceptedTerms) return res.status(400).json({ error: "You must accept the Terms of Service" });

      const { data, error } = await supabase.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { first_name: firstName || "", last_name: lastName || "" },
      });

      if (error) {
        const safeMsg = error.message?.includes("already registered") ? "This email is already registered." : "Signup failed.";
        return res.status(400).json({ error: safeMsg });
      }

      try { await pool.query("UPDATE users SET terms_accepted_at = NOW(), privacy_accepted_at = NOW() WHERE id = $1", [data.user.id]); } catch {}
      res.json({ user: { id: data.user.id, email: data.user.email } });
    } catch (error: any) {
      console.error("Signup error:", error);
      res.status(500).json({ error: "Failed to create account" });
    }
  });
}
