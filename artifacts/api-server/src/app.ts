import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import router from "./routes";
import { logger } from "./lib/logger";
import { CLERK_PROXY_PATH, clerkProxyMiddleware } from "./middlewares/clerkProxyMiddleware";

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

// Clerk proxy must be mounted before body parsers
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

// Webhooks MUST be mounted before express.json() to preserve raw body
app.use("/api/webhooks", clerkWebhooksRouter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Parse Clerk authentication tokens for all routes
app.use(clerkMiddleware());

app.use("/api", router);

export default app;
