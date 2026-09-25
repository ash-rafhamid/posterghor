import pino from "pino";
import { env } from "../config/env";

export const logger = pino({
  level: env.LOG_LEVEL,
  ...(env.isProd
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" },
        },
      }),
  redact: ["req.headers.authorization", "password", "passwordHash"],
});
