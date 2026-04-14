import type { Request, Response, NextFunction } from "express";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

// Middleware: require admin
export function isAdmin(req: any, res: Response, next: NextFunction) {
  if (!req.user?.claims?.email || req.user.claims.email !== ADMIN_EMAIL) {
    return res.status(403).json({ error: "Admin only" });
  }
  next();
}

// Middleware: resolve community context
// Admin can access any community via X-Org-Id header or ?orgId query param
// Residents are resolved from their auth ID
export async function resolveCommunityContext(req: any, res: Response, next: NextFunction) {
  const { pool } = await import("../db");
  const userId = req.user?.claims?.sub;
  const userEmail = req.user?.claims?.email;
  const isAdminUser = userEmail === ADMIN_EMAIL;

  // Admin can specify which community to act on
  const orgIdOverride = req.headers["x-org-id"] || req.query.orgId;
  if (isAdminUser && orgIdOverride) {
    const orgResult = await pool.query("SELECT id, name, slug FROM organizations WHERE id = $1", [orgIdOverride]);
    if (orgResult.rows.length === 0) return res.status(404).json({ error: "Community not found" });
    req.communityContext = { orgId: Number(orgIdOverride), isAdmin: true, residentId: null, role: "admin" };
    return next();
  }

  // Admin without org context — they're not a resident
  if (isAdminUser && !orgIdOverride) {
    req.communityContext = { orgId: null, isAdmin: true, residentId: null, role: "admin" };
    return next();
  }

  // Regular user — look up resident record
  if (userId) {
    const resResult = await pool.query(
      "SELECT id, organization_id, role FROM residents WHERE supabase_auth_id = $1 AND is_active = true LIMIT 1",
      [userId]
    );
    if (resResult.rows.length > 0) {
      const row = resResult.rows[0];
      req.communityContext = { orgId: row.organization_id, isAdmin: false, residentId: row.id, role: row.role };
      return next();
    }
  }

  // No context found
  req.communityContext = { orgId: null, isAdmin: false, residentId: null, role: null };
  next();
}
