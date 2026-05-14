import pino from "pino";

export function createLogger(level: string) {
  return pino({
    level,
    redact: {
      paths: [
        "password",
        "*.password",
        "*.cookie",
        "*.token",
        "headers.authorization",
        "headers.cookie",
      ],
      remove: true,
    },
  });
}
