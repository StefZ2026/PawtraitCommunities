import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { createServer } from "http";
import { seedDatabase } from "./seed";
import { setupWebSocket } from "./websocket";

process.on("uncaughtException", (err) => { console.error("[FATAL] Uncaught:", err.message); console.error(err.stack); });
process.on("unhandledRejection", (reason: any) => { console.error("[FATAL] Unhandled rejection:", reason?.message || reason); });

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"], scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://*.supabase.co"],
      connectSrc: ["'self'", "https://*.supabase.co"],
    },
  },
  crossOriginEmbedderPolicy: false, crossOriginOpenerPolicy: false, crossOriginResourcePolicy: false,
}));
app.disable("x-powered-by");

const httpServer = createServer(app);
setupWebSocket(httpServer);

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: false }));

function log(message: string, source = "express") {
  const time = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });
  console.log(`${time} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let captured: any;
  const origJson = res.json;
  res.json = function (body, ...args) { captured = body; return origJson.apply(res, [body, ...args]); };
  res.on("finish", () => {
    if (path.startsWith("/api")) {
      let line = `${req.method} ${path} ${res.statusCode} in ${Date.now() - start}ms`;
      if (captured) line += ` :: ${JSON.stringify(captured).slice(0, 500)}`;
      log(line);
    }
  });
  next();
});

app.get("/healthz", (_req, res) => res.status(200).json({ status: "ok" }));

const port = parseInt(process.env.PORT || "5000", 10);

httpServer.listen({ port, host: "0.0.0.0" }, () => {
  log(`serving on port ${port}`);
  (async () => {
    try { await seedDatabase(); log("Database seeded"); } catch (e) { console.error("Seed error:", e); }
    try { await registerRoutes(httpServer, app); log("Routes registered"); } catch (e) { console.error("Route error:", e); }

    app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
      console.error("Error:", err);
      if (res.headersSent) return next(err);
      res.status(err.status || 500).json({ message: "Internal Server Error" });
    });

    if (process.env.NODE_ENV === "production") {
      const { serveStatic } = await import("./static");
      serveStatic(app);
    } else {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    }
    log("All initialized");
  })().catch(err => console.error("Fatal:", err));
});

httpServer.keepAliveTimeout = 120000;
httpServer.headersTimeout = 125000;
