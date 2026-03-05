import { setTimeout as sleep } from "node:timers/promises";
import pino from "pino";

const logger = pino({ name: "semse-worker" });

const config = {
  apiBaseUrl: process.env.SEMSE_API_URL ?? "http://localhost:4000",
  workerId: process.env.SEMSE_WORKER_ID ?? `worker-local-${process.pid}`,
  tenantId: process.env.SEMSE_TENANT_ID ?? "tnt_demo",
  userId: process.env.SEMSE_USER_ID ?? "usr_worker_001",
  orgId: process.env.SEMSE_ORG_ID ?? "org_worker",
  roles: process.env.SEMSE_ROLES ?? "WORKER",
  pollIntervalMs: Number(process.env.SEMSE_POLL_MS ?? 3000),
  heartbeatIntervalMs: Number(process.env.SEMSE_HEARTBEAT_MS ?? 2500),
  runDurationMs: Number(process.env.SEMSE_RUN_SIM_MS ?? 4000),
  failRate: Number(process.env.SEMSE_FAIL_RATE ?? 0),
  reclaimIntervalMs: Number(process.env.SEMSE_RECLAIM_MS ?? 10000),
  staleAfterMs: Number(process.env.SEMSE_STALE_AFTER_MS ?? 10000),
  agentType: process.env.SEMSE_AGENT_TYPE ?? undefined
};

let shouldStop = false;
let lastReclaimAt = 0;

process.on("SIGINT", () => {
  shouldStop = true;
  logger.info("received SIGINT, finishing current iteration");
});

process.on("SIGTERM", () => {
  shouldStop = true;
  logger.info("received SIGTERM, finishing current iteration");
});

async function main() {
  logger.info(
    {
      workerId: config.workerId,
      apiBaseUrl: config.apiBaseUrl,
      pollIntervalMs: config.pollIntervalMs,
      heartbeatIntervalMs: config.heartbeatIntervalMs,
      runDurationMs: config.runDurationMs,
      reclaimIntervalMs: config.reclaimIntervalMs,
      staleAfterMs: config.staleAfterMs,
      agentType: config.agentType ?? "any"
    },
    "worker started"
  );

  while (!shouldStop) {
    try {
      await maybeReclaimStaleRuns();
      const run = await claimRun();
      if (!run) {
        await sleep(config.pollIntervalMs);
        continue;
      }

      await processRun(run);
    } catch (error) {
      logger.error({ error }, "worker iteration failed");
      await sleep(config.pollIntervalMs);
    }
  }

  logger.info("worker stopped");
}

async function claimRun() {
  const body = {
    workerId: config.workerId,
    ...(config.agentType ? { agentType: config.agentType } : {})
  };

  const response = await postJson("/v1/agents/runs/claim", body);
  const run = response?.data ?? null;

  if (run) {
    logger.info(
      {
        runId: run.id,
        agentType: run.agentType,
        correlationId: run.correlationId,
        attempts: run.attempts
      },
      "claimed run"
    );
  }

  return run;
}

async function maybeReclaimStaleRuns() {
  const now = Date.now();
  if (now - lastReclaimAt < config.reclaimIntervalMs) {
    return;
  }
  lastReclaimAt = now;

  const response = await postJson("/v1/agents/runs/reclaim-stale", {
    staleAfterMs: config.staleAfterMs,
    maxItems: 20
  });

  const reclaimedCount = response?.data?.reclaimedCount ?? 0;
  if (reclaimedCount > 0) {
    logger.warn({ reclaimedCount }, "reclaimed stale runs");
  } else {
    logger.debug("no stale runs to reclaim");
  }
}

async function processRun(run) {
  const runId = run.id;
  let heartbeatTimer;

  try {
    heartbeatTimer = setInterval(() => {
      void heartbeatRun(runId);
    }, config.heartbeatIntervalMs);

    // Simulate execution. Replace by real agent orchestrator call.
    await sleep(config.runDurationMs);

    if (shouldFail()) {
      await failRun(runId, "simulated worker failure");
      return;
    }

    await completeRun(runId, {
      summary: `Run ${runId} completed by ${config.workerId}`,
      processedAt: new Date().toISOString()
    });
  } finally {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
    }
  }
}

function shouldFail() {
  return config.failRate > 0 && Math.random() < config.failRate;
}

async function heartbeatRun(runId) {
  try {
    await postJson(`/v1/agents/runs/${runId}/heartbeat`, {
      workerId: config.workerId
    });
    logger.debug({ runId }, "heartbeat sent");
  } catch (error) {
    logger.warn({ runId, error }, "heartbeat failed");
  }
}

async function completeRun(runId, output) {
  await postJson(`/v1/agents/runs/${runId}/complete`, { output });
  logger.info({ runId }, "run completed");
}

async function failRun(runId, errorMessage) {
  await postJson(`/v1/agents/runs/${runId}/fail`, { error: errorMessage });
  logger.warn({ runId, errorMessage }, "run failed");
}

async function postJson(path, body) {
  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-user-id": config.userId,
      "x-tenant-id": config.tenantId,
      "x-org-id": config.orgId,
      "x-roles": config.roles
    },
    body: JSON.stringify(body)
  });

  const payload = await response.json();
  if (!response.ok) {
    const message = payload?.error?.message ?? payload;
    throw new Error(`HTTP ${response.status} ${path}: ${JSON.stringify(message)}`);
  }

  return payload;
}

main().catch((error) => {
  logger.error({ error }, "fatal worker error");
  process.exit(1);
});
