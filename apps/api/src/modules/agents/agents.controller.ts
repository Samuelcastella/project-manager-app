import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Req } from "@nestjs/common";
import { z } from "zod";
import { ok } from "../../common/api-response.js";
import { appendAudit } from "../../common/audit-log.store.js";
import { resolveRequestId } from "../../common/request-id.js";

type AgentRun = {
  id: string;
  agentType: "pricing" | "job-planner" | "evidence-coach" | "risk" | "dispute";
  status: "queued" | "running" | "completed" | "failed";
  triggerType: "manual" | "event" | "schedule";
  correlationId: string;
  createdAt: string;
};

const createAgentRunSchema = z.object({
  actorUserId: z.string().min(1).default("usr_demo_001"),
  agentType: z.enum(["pricing", "job-planner", "evidence-coach", "risk", "dispute"]),
  triggerType: z.enum(["manual", "event", "schedule"]).default("manual"),
  correlationId: z.string().min(1)
});

const runs: AgentRun[] = [];

@Controller("v1/agents")
export class AgentsController {
  @Get("catalog")
  catalog(@Req() req: any) {
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
  listRuns(@Req() req: any) {
    return ok(resolveRequestId(req.headers ?? {}), runs);
  }

  @Get("runs/:runId")
  detail(@Req() req: any, @Param("runId") runId: string) {
    const run = runs.find((entry) => entry.id === runId);
    if (!run) {
      throw new NotFoundException(`Agent run '${runId}' not found`);
    }
    return ok(resolveRequestId(req.headers ?? {}), run);
  }

  @Post("runs")
  createRun(@Req() req: any, @Body() body: Record<string, unknown>) {
    const parsed = createAgentRunSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const input = parsed.data;
    const requestId = resolveRequestId(req.headers ?? {});
    const run: AgentRun = {
      id: `run_${Date.now()}`,
      agentType: input.agentType,
      triggerType: input.triggerType,
      correlationId: input.correlationId,
      status: "queued",
      createdAt: new Date().toISOString()
    };

    runs.unshift(run);
    appendAudit({
      id: `aud_${Date.now()}`,
      actorUserId: input.actorUserId,
      action: "agent.run.create",
      entityType: "AgentRun",
      entityId: run.id,
      requestId,
      timestamp: new Date().toISOString()
    });

    return ok(requestId, run);
  }

  @Post("runs/:runId/retry")
  retry(@Req() req: any, @Param("runId") runId: string, @Body() body: { actorUserId?: string }) {
    const run = runs.find((entry) => entry.id === runId);
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
      actorUserId: body.actorUserId ?? "usr_demo_001",
      action: "agent.run.retry",
      entityType: "AgentRun",
      entityId: run.id,
      requestId,
      timestamp: new Date().toISOString()
    });

    return ok(requestId, run);
  }
}
