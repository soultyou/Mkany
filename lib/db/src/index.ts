import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index";

const { Pool } = pg;

let pool: any = null;
let db: any = null;

export function getPoolConfig(connectionString?: string): any {
  if (!connectionString) return null;
  try {
    const u = new URL(connectionString);
    if (u.hostname.includes("supabase.co") && u.hostname.startsWith("db.")) {
      const parts = u.hostname.split(".");
      const projectRef = parts[1];
      const password = decodeURIComponent(u.password);
      return {
        host: "aws-0-eu-central-1.pooler.supabase.com",
        port: 6543,
        user: `postgres.${projectRef}`,
        password,
        database: u.pathname.replace(/^\//, "") || "postgres",
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
      };
    }
    return {
      connectionString,
      ssl: connectionString.includes("sslmode=disable") ? false : { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    };
  } catch {
    return { connectionString, ssl: { rejectUnauthorized: false } };
  }
}

export function setRuntimeDatabaseUrl(connectionString: string) {
  if (!connectionString) return;
  try {
    const config = getPoolConfig(connectionString);
    pool = new Pool(config);
    db = drizzle(pool, { schema });
  } catch (err) {
    console.error('[Database] Runtime initialization error:', err);
  }
}

if (process.env.DATABASE_URL) {
  try {
    const config = getPoolConfig(process.env.DATABASE_URL);
    pool = new Pool(config);
    db = drizzle(pool, { schema });
  } catch (err) {
    console.error('[Database] Connection initialization error:', err);
    if (process.env.NODE_ENV === "production") {
      throw new Error('Database initialization failed');
    }
  }
}

if (!db) {
  const noOp = {
    findMany: async () => {
      if (process.env.NODE_ENV === "production" && !pool) throw new Error('DATABASE_URL environment variable is required in production');
      return [];
    },
    findFirst: async () => {
      if (process.env.NODE_ENV === "production" && !pool) throw new Error('DATABASE_URL environment variable is required in production');
      return null;
    },
    findUnique: async () => {
      if (process.env.NODE_ENV === "production" && !pool) throw new Error('DATABASE_URL environment variable is required in production');
      return null;
    },
    create: async () => {
      if (process.env.NODE_ENV === "production" && !pool) throw new Error('DATABASE_URL environment variable is required in production');
      return {};
    },
    update: async () => {
      if (process.env.NODE_ENV === "production" && !pool) throw new Error('DATABASE_URL environment variable is required in production');
      return {};
    },
    delete: async () => {
      if (process.env.NODE_ENV === "production" && !pool) throw new Error('DATABASE_URL environment variable is required in production');
      return {};
    },
  };
  db = new Proxy({}, {
    get: (_, prop) => {
      if (!pool && process.env.NODE_ENV === "production") {
        throw new Error('DATABASE_URL environment variable is required in production');
      }
      return prop === 'query' ? new Proxy({}, { get: () => noOp }) : async () => {
        if (!pool && process.env.NODE_ENV === "production") {
          throw new Error('DATABASE_URL environment variable is required in production');
        }
        return [];
      };
    },
  });
}

export { pool, db };
export * from "./schema/index";
