import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

function parseDbUrl(url: string) {
  try {
    const parsed = new URL(url);
    return {
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      host: parsed.hostname,
      port: parseInt(parsed.port) || 5432,
      database: parsed.pathname.slice(1) || "postgres",
    };
  } catch {
    return { connectionString: url };
  }
}

const dbConfig = parseDbUrl(process.env.DATABASE_URL);

export const pool = new Pool({
  ...dbConfig,
  ssl: { rejectUnauthorized: false },
});

export const db = drizzle(pool, { schema });
