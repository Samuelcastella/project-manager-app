import { BadRequestException, Body, Controller, Get, Param, Patch, Query, Req } from "@nestjs/common";
import { z } from "zod";
import { ok } from "../../common/api-response.js";
import { appendAudit } from "../../common/audit-log.store.js";
import { findProjectOrThrow, getEscrowSummary, listProjects, updateProjectStatus } from "../../common/domain-service.js";
import { domainStore } from "../../common/domain-store.js";
import { RequirePermissions } from "../../common/permissions.decorator.js";
import { resolveRequestContext } from "../../common/request-context.js";
import { resolveRequestId } from "../../common/request-id.js";

const listProjectsQuerySchema = z.object({
  status: z.enum(["open", "in_progress", "blocked", "completed", "cancelled"]).optional(),
  jobId: z.string().min(1).optional()
});

const updateProjectStatusSchema = z.object({
  status: z.enum(["open", "in_progress", "blocked", "completed", "cancelled"])
});

@Controller("v1/projects")
export class ProjectsController {
  @Get()
  @RequirePermissions("jobs:read")
  list(@Req() req: { headers?: Record<string, unknown> }, @Query() query: Record<string, unknown>) {
    const parsed = listProjectsQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const actor = resolveRequestContext(req);
    const projects = listProjects({
      tenantId: actor.tenantId,
      status: parsed.data.status,
      jobId: parsed.data.jobId
    });
    return ok(resolveRequestId(req.headers ?? {}), projects);
  }

  @Get(":projectId")
  @RequirePermissions("jobs:read")
  detail(@Req() req: { headers?: Record<string, unknown> }, @Param("projectId") projectId: string) {
    const actor = resolveRequestContext(req);
    const project = findProjectOrThrow({ tenantId: actor.tenantId, projectId });
    return ok(resolveRequestId(req.headers ?? {}), project);
  }

  @Get(":projectId/payments")
  @RequirePermissions("jobs:read")
  payments(@Req() req: { headers?: Record<string, unknown> }, @Param("projectId") projectId: string) {
    const actor = resolveRequestContext(req);
    const transactions = domainStore.paymentTxns.filter(
      (entry) => entry.projectId === projectId && entry.tenantId === actor.tenantId
    );

    return ok(resolveRequestId(req.headers ?? {}), transactions);
  }

  @Get(":projectId/escrow")
  @RequirePermissions("jobs:read")
  escrow(@Req() req: { headers?: Record<string, unknown> }, @Param("projectId") projectId: string) {
    const actor = resolveRequestContext(req);
    const summary = getEscrowSummary({ tenantId: actor.tenantId, projectId });
    return ok(resolveRequestId(req.headers ?? {}), summary);
  }

  @Patch(":projectId/status")
  @RequirePermissions("milestones:submit")
  updateStatus(
    @Req() req: { headers?: Record<string, unknown> },
    @Param("projectId") projectId: string,
    @Body() body: Record<string, unknown>
  ) {
    const parsed = updateProjectStatusSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const actor = resolveRequestContext(req);
    const requestId = resolveRequestId(req.headers ?? {});
    const project = updateProjectStatus({
      tenantId: actor.tenantId,
      projectId,
      status: parsed.data.status
    });

    appendAudit({
      id: `aud_${Date.now()}`,
      actorUserId: actor.userId,
      action: "project.status.update",
      entityType: "Project",
      entityId: project.id,
      requestId,
      timestamp: new Date().toISOString()
    });

    return ok(requestId, project);
  }
}
