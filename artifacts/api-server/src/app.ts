import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import path from "node:path";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import router from "./routes";
import { logger } from "./lib/logger";
import { clerkWebhooksRouter } from "./routes/webhooks";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// Build environment-driven CORS origin allowlist
const getAllowedOrigins = (): Set<string> => {
  const origins = new Set<string>();
  const envVars = [
    process.env.ALLOWED_ORIGINS,
    process.env.CLIENT_URL,
    process.env.ADMIN_URL,
    process.env.VITE_CLIENT_URL,
    process.env.VITE_ADMIN_URL,
    process.env.VITE_API_URL,
    process.env.APP_URL,
    process.env.SHARED_APP_URL,
    process.env.DEV_APP_URL,
  ];

  for (const envVar of envVars) {
    if (envVar) {
      envVar.split(",").map((s) => s.trim()).filter(Boolean).forEach((o) => origins.add(o));
    }
  }

  // Always include published frontend origin and Cloud Run / AI Studio origins
  origins.add("https://mkany-student-housing.ai.studio");

  // Always include local dev origins when not in production
  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:3000");
    origins.add("http://localhost:5173");
    origins.add("http://localhost:5174");
    origins.add("http://127.0.0.1:3000");
    origins.add("http://127.0.0.1:5173");
    origins.add("http://127.0.0.1:5174");
  }

  return origins;
};

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin header (same-origin, server-to-server, curl)
      if (!origin) {
        return callback(null, true);
      }

      const allowedOrigins = getAllowedOrigins();

      if (allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      // Allow any AI Studio or Cloud Run preview/published domain
      if (origin.endsWith(".ai.studio") || origin.endsWith(".run.app") || origin.includes("ai.studio")) {
        return callback(null, true);
      }

      // In non-production mode, allow any local loopback origin
      if (process.env.NODE_ENV !== "production") {
        if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
          return callback(null, true);
        }
      }

      return callback(new Error(`CORS policy: Origin ${origin} not allowed by access control configuration`));
    },
    credentials: true,
  }),
);

// Webhooks MUST be mounted before express.json() to preserve raw body
app.use("/api/webhooks", clerkWebhooksRouter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Safe clerk middleware application with strict production fail-closed semantics
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path === "/api/healthz" || req.path === "/healthz") {
    next();
    return;
  }
  
  const publishableKey = process.env.CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const secretKey = process.env.CLERK_SECRET_KEY;

  if (secretKey && publishableKey) {
    clerkMiddleware({
      publishableKey,
      secretKey
    })(req, res, next);
    return;
  } else {
    if (process.env.NODE_ENV === "production") {
      logger.error("CRITICAL: Missing required Clerk configuration keys in production mode! Failing closed.");
      res.status(500).json({
        error: "Server Configuration Error",
        message: "Clerk authentication service is misconfigured in production mode.",
      });
      return;
    }
    logger.warn("Clerk keys are missing in development mode. Bypassing clerkMiddleware initialization.");
    next();
    return;
  }
});

app.use("/api", router);

// Serve static frontend build and SPA fallback for non-API routes
const distPath = path.resolve(__dirname, "../../dist");
app.use(express.static(distPath));

app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    return next();
  }
  res.sendFile(path.join(distPath, "index.html"));
});

export default app;
