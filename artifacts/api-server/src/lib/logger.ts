import pino from "pino";

let logger: any;
const isProduction = process.env.NODE_ENV === "production";

try {
  logger = pino({
    level: process.env.LOG_LEVEL ?? "info",
    redact: [
      "req.headers.authorization",
      "req.headers.cookie",
      "res.headers['set-cookie']",
    ],
    ...(isProduction
      ? {}
      : {
          transport: {
            target: "pino-pretty",
            options: { colorize: true },
          },
        }),
  });
} catch {
  logger = {
    info: (obj: any, msg?: string) => console.log(msg ?? obj, typeof obj === 'object' ? obj : ''),
    warn: (obj: any, msg?: string) => console.warn(msg ?? obj, typeof obj === 'object' ? obj : ''),
    error: (obj: any, msg?: string) => console.error(msg ?? obj, typeof obj === 'object' ? obj : ''),
    debug: (obj: any, msg?: string) => console.debug(msg ?? obj, typeof obj === 'object' ? obj : ''),
    child: () => logger,
  };
}

export { logger };

