import pino from "pino";

const logger = pino({ name: "semse-worker" });

logger.info(
  {
    queue: process.env.BULLMQ_QUEUE_NAME ?? "agent-runs",
    redisHost: process.env.REDIS_HOST ?? "localhost"
  },
  "worker bootstrap placeholder"
);
