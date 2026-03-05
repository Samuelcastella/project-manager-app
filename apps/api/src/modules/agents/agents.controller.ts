import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Req } from "@nestjs/common";
import { z } from "zod";
import { ok } from "../../common/api-response.js";
import { appendAudit } from "../../common/audit-log.store.js";
import {
  completeAgentRun,
  createAgentRun,
  failAgentRun,
  retryAgentRun,
  startAgentRun
} from "../../common/domain-service.js";
import { domainStore } from "../../common/domain-store.js";
import { RequirePermissions } from "../../common/permissions.decorator.js";
import { resolveRequestContext } from "../../common/request-context.js";
import { resolveRequestId } from "../../common/request-id.js";

const createAgentRunSchema = z.object({
  agentType: z.enum(["pricing", "job-planner", "evidence-coach", "risk", "dispute"]),
  triggerType: z.enum(["manual", "event", "schedule"]).default("manual"),
  correlationId: z.string().min(1)
});

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
      domainStore.agentRuns.filter((entry) => entry.tenantId === actor.tenantId)
    );
  }

  @Get("runs/:runId")
  @RequirePermissions("agents:run:create")
  detail(@Req() req: { headers?: Record<string, unknown> }, @Param("runId") runId: string) {
    const actor = resolveRequestContext(req);
    const run = domainStore.agentRuns.find((entry) => entry.id === runId && entry.tenantId === actor.tenantId);
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
    const idempotencyHeader = req.headers?.["x-idempotency-key"];
    const idempotencyKey = typeof idempotencyHeader === "string" ? idempotencyHeader : undefined;

    const run = createAgentRun({
      tenantId: actor.tenantId,
      userId: actor.userId,
      agentType: parsed.data.agentType,
      triggerType: parsed.data.triggerType,
      correlationId: parsed.data.correlationId,
      idempotencyKey
    });

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
    const run = retryAgentRun({ tenantId: actor.tenantId, runId });

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

  @Post("runs/:runId/start")
  @RequirePermissions("agents:run:manage")
  start(@Req() req: { headers?: Record<string, unknown> }, @Param("runId") runId: string) {
    const actor = resolveRequestContext(req);
    const run = startAgentRun({ tenantId: actor.tenantId, runId });
    const requestId = resolveRequestId(req.headers ?? {});
    appendAudit({
      id: `aud_${Date.now()}`,
      actorUserId: actor.userId,
      action: "agent.run.start",
      entityType: "AgentRun",
      entityId: run.id,
      requestId,
      timestamp: new Date().toISOString()
    });
    return ok(requestId, run);
  }

  @Post("runs/:runId/complete")
  @RequirePermissions("agents:run:manage")
  complete(
    @Req() req: { headers?: Record<string, unknown> },
    @Param("runId") runId: string,
    @Body() body: { output?: Record<string, unknown> }
  ) {
    const actor = resolveRequestContext(req);
    const run = completeAgentRun({
      tenantId: actor.tenantId,
      runId,
      output: body.output
    });
    const requestId = resolveRequestId(req.headers ?? {});
    appendAudit({
      id: `aud_${Date.now()}`,
      actorUserId: actor.userId,
      action: "agent.run.complete",
      entityType: "AgentRun",
      entityId: run.id,
      requestId,
      timestamp: new Date().toISOString()
    });
    return ok(requestId, run);
  }

  @Post("runs/:runId/fail")
  @RequirePermissions("agents:run:manage")
  fail(
    @Req() req: { headers?: Record<string, unknown> },
    @Param("runId") runId: string,
    @Body() body: { error: string }
  ) {
    if (!body.error) {
      throw new BadRequestException("error is required");
    }
    const actor = resolveRequestContext(req);
    const run = failAgentRun({
      tenantId: actor.tenantId,
      runId,
      error: body.error
    });
    const requestId = resolveRequestId(req.headers ?? {});
    appendAudit({
      id: `aud_${Date.now()}`,
      actorUserId: actor.userId,
      action: "agent.run.fail",
      entityType: "AgentRun",
      entityId: run.id,
      requestId,
      timestamp: new Date().toISOString()
    });
    return ok(requestId, run);
  }
}
