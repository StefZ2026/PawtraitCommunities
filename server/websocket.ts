import { Server as HttpServer } from "http";
import { Server as SocketServer } from "socket.io";
import { createClient } from "@supabase/supabase-js";
import { pool } from "./db";

let io: any = null;

export function getIo(): any { return io; }

export function setupWebSocket(httpServer: HttpServer): any {
  io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === "production"
        ? ["https://pawtraitcommunities.com"]
        : ["http://localhost:5000", "http://localhost:5173"],
      credentials: true,
    },
    path: "/ws",
  });

  io.use(async (socket: any, next: any) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication required"));
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseKey) return next(new Error("Server configuration error"));
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) return next(new Error("Invalid token"));
      (socket as any).userId = user.id;
      (socket as any).userEmail = user.email;
      next();
    } catch { next(new Error("Authentication failed")); }
  });

  io.on("connection", async (socket: any) => {
    const userId = (socket as any).userId;
    try {
      const result = await pool.query("SELECT organization_id FROM residents WHERE supabase_auth_id = $1", [userId]);
      if (result.rows.length > 0) {
        socket.join(`community:${result.rows[0].organization_id}`);
        socket.emit("connected", { communityId: result.rows[0].organization_id, role: "resident" });
      } else {
        const isAdmin = (socket as any).userEmail === process.env.ADMIN_EMAIL;
        socket.emit("connected", { role: isAdmin ? "admin" : "visitor" });
      }
    } catch (err) { console.error("[websocket] Error:", err); }
  });

  console.log("[websocket] Socket.IO initialized on /ws");
  return io;
}
