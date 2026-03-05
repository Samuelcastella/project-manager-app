import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Req } from "@nestjs/common";
import { z } from "zod";
import { ok } from "../../common/api-response.js";
import { appendAudit } from "../../common/audit-log.store.js";
import { RequirePermissions } from "../../common/permissions.decorator.js";
import { resolveRequestContext } from "../../common/request-context.js";
import { resolveRequestId } from "../../common/request-id.js";

type AgentRun = {
  id: string;
  tenantId: string;
  agentType: "pricing" | "job-planner" | "evidence-coach" | "risk" | "dispute";
  status: "queued" | "running" | "completed" | "failed";
  triggerType: "manual" | "event" | "schedule";
  correlationId: string;
  createdAt: string;
};

const createAgentRunSchema = z.object({
  agentType: z.enum(["pricing", "job-planner", "evidence-coach", "risk", "dispute"]),
  triggerType: z.enum(["manual", "event", "schedule"]).default("manual"),
  correlationId: z.string().min(1)
});

const runs: AgentRun[] = [];

@Controller("v1/agents")
export class AgentsController {
  @Get("catalog")
  @RequirePermissions("agents:run:create")
  catalog(@Req() req: { headers?: Record<string, unknown> }) {
    const data = [
      { key: "pricing", purpose: "suggested pricing" },
      { key: "job-planner", purpose: "execution plan" },
      { key: "evidence-coach", purpose: "evidence guidance" },
      { key: "risk", purpose: "risk scoring" },
      { key: "dispute", purpose: "dispute recommendation" }
    ];
    return ok(resolveRequestId(req.headers ?? {}), data);
  }

  @Get("runs")
  @RequirePermissions("agents:run:create")
  listRuns(@Req() req: { headers?: Record<string, unknown> }) {
    const actor = resolveRequestContext(req);
    return ok(
      resolveRequestId(req.headers ?? {}),
      runs.filter((entry) => entry.tenantId === actor.tenantId)
    );
  }

  @Get("runs/:runId")
  @RequirePermissions("agents:run:create")
  detail(@Req() req: { headers?: Record<string, unknown> }, @Param("runId") runId: string) {
    const actor = resolveRequestContext(req);
    const run = runs.find((entry) => entry.id === runId && entry.tenantId === actor.tenantId);
    if (!run) {
      throw new NotFoundException(`Agent run '${runId}' not found`);
    }
    return ok(resolveRequestId(req.headers ?? {}), run);
  }

  @Post("runs")
  @RequirePermissions("agents:run:create")
  createRun(@Req() req: { headers?: Record<string, unknown> }, @Body() body: Record<string, unknown>) {
    const parsed = createAgentRunSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const actor = resolveRequestContext(req);
    const requestId = resolveRequestId(req.headers ?? {});
    const run: AgentRun = {
      id: `run_${Date.now()}`,
      tenantId: actor.tenantId,
      agentType: parsed.data.agentType,
      triggerType: parsed.data.triggerType,
      correlationId: parsed.data.correlationId,
      status: "queued",
      createdAt: new Date().toISOString()
    };

    runs.unshift(run);
    appendAudit({
      id: `aud_${Date.now()}`,
      actorUserId: actor.userId,
      action: "agent.run.create",
      entityType: "AgentRun",
      entityId: run.id,
      requestId,
      timestamp: new Date().toISOString()
    });

    return ok(requestId, run);
  }

  @Post("runs/:runId/retry")
  @RequirePermissions("agents:run:retry")
  retry(@Req() req: { headers?: Record<string, unknown> }, @Param("runId") runId: string) {
    const actor = resolveRequestContext(req);
    const run = runs.find((entry) => entry.id === runId && entry.tenantId === actor.tenantId);
    if (!run) {
      throw new NotFoundException(`Agent run '${runId}' not found`);
    }

    if (run.status === "running") {
      throw new BadRequestException("running run cannot be retried");
    }

    run.status = "queued";
    const requestId = resolveRequestId(req.headers ?? {});
    appendAudit({
      id: `aud_${Date.now()}`,
      actorUserId: actor.userId,
      action: "agent.run.retry",
      entityType: "AgentRun",
      entityId: run.id,
      requestId,
      timestamp: new Date().toISOString()
    });

    return ok(requestId, run);
  }
}
