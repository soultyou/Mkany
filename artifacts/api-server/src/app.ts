import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
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

app.use(cors());

// Webhooks MUST be mounted before express.json() to preserve raw body
app.use("/api/webhooks", clerkWebhooksRouter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Safe clerk middleware application
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
    logger.warn("Clerk keys are missing. Authentication is disabled/bypassed.");
    next();
    return;
  }
});

app.use("/api", router);

export default app;
