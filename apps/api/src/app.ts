import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import { errorHandler, notFoundHandler } from "./middleware/error";
import { apiLimiter } from "./middleware/rateLimit";
import { apiRouter } from "./routes";
import { UPLOAD_ROOT } from "./services/storage/local";

export function createApp(): express.Express {
  const app = express();
  app.disable("x-powered-by");
  // Render / Fly / any reverse proxy: trust the first hop so rate limiting sees real client IPs.
  app.set("trust proxy", 1);

  // One compact line per request. Health checks, static files and the studio's status polling are not logged.
  const noisy = (req: { method?: string; url?: string }) =>
    req.url === "/api/health" ||
    req.url?.startsWith("/files/") === true ||
    (req.method === "GET" && /^\/api\/posters\/(?:[a-f0-9]{24}|batch)(?:\?|$)/.test(req.url ?? ""));
  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: noisy },
      customLogLevel: (_req, res, err) => (err || res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info"),
      customSuccessMessage: (req, res, ms) => `${req.method} ${req.url} → ${res.statusCode} (${Math.round(ms)}ms)`,
      customErrorMessage: (req, res) => `${req.method} ${req.url} → ${res.statusCode} failed`,
      serializers: { req: () => undefined, res: () => undefined },
      customAttributeKeys: { responseTime: "ms" },
    }),
  );

  // Images are embedded by the web app on another origin, so allow cross-origin resource loading.
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(
    cors({
      origin(origin, cb) {
        // non-browser clients (curl, server-to-server) send no Origin header
        if (!origin || env.corsOrigins.includes(origin.replace(/\/$/, ""))) return cb(null, true);
        cb(null, false);
      },
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      exposedHeaders: ["Content-Disposition", "RateLimit", "RateLimit-Policy"],
      maxAge: 86400,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: "1mb" }));

  // Locally stored uploads / posters (development). Production uses Cloudinary URLs.
  if (env.storageDriver === "local") {
    app.use(
      "/files",
      express.static(UPLOAD_ROOT, {
        maxAge: "30d",
        immutable: true,
        setHeaders: (res) => {
          res.setHeader("Access-Control-Allow-Origin", "*");
        },
      }),
    );
  }

  app.get("/", (_req, res) => {
    res.json({ name: "AI Political Poster Maker API", docs: "/api/health" });
  });

  app.use("/api", apiLimiter, apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
