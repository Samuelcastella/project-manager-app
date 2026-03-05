import { BadRequestException, Body, Controller, Param, Post, Req } from "@nestjs/common";
import { ok } from "../../common/api-response.js";
import { appendAudit } from "../../common/audit-log.store.js";
import { approveMilestone, createMilestone, rejectMilestone, submitMilestone } from "../../common/domain-service.js";
import { RequirePermissions } from "../../common/permissions.decorator.js";
import { resolveRequestContext } from "../../common/request-context.js";
import { resolveRequestId } from "../../common/request-id.js";

@Controller()
export class MilestonesController {
  @Post("v1/projects/:projectId/milestones")
  @RequirePermissions("milestones:submit")
  create(@Req() req: { headers?: Record<string, unknown> }, @Param("projectId") projectId: string, @Body() body: { title: string; amount: number; sequence: number }) {
    const actor = resolveRequestContext(req);
    const requestId = resolveRequestId(req.headers ?? {});
    const milestone = createMilestone({
      tenantId: actor.tenantId,
      projectId,
      title: body.title,
      amount: body.amount,
      sequence: body.sequence
    });
    appendAudit({
      id: `aud_${Date.now()}`,
      actorUserId: actor.userId,
      action: "milestone.create",
      entityType: "Milestone",
      entityId: milestone.id,
      requestId,
      timestamp: new Date().toISOString()
    });

    return ok(requestId, milestone);
  }

  @Post("v1/milestones/:milestoneId/submit")
  @RequirePermissions("milestones:submit")
  submit(@Req() req: { headers?: Record<string, unknown> }, @Param("milestoneId") milestoneId: string) {
    const actor = resolveRequestContext(req);
    const requestId = resolveRequestId(req.headers ?? {});
    const milestone = submitMilestone({ tenantId: actor.tenantId, milestoneId });
    appendAudit({
      id: `aud_${Date.now()}`,
      actorUserId: actor.userId,
      action: "milestone.submit",
      entityType: "Milestone",
      entityId: milestoneId,
      requestId,
      timestamp: new Date().toISOString()
    });
    return ok(requestId, milestone);
  }

  @Post("v1/milestones/:milestoneId/approve")
  @RequirePermissions("milestones:approve")
  approve(@Req() req: { headers?: Record<string, unknown> }, @Param("milestoneId") milestoneId: string) {
    const actor = resolveRequestContext(req);
    const requestId = resolveRequestId(req.headers ?? {});
    const milestone = approveMilestone({ tenantId: actor.tenantId, milestoneId });
    appendAudit({
      id: `aud_${Date.now()}`,
      actorUserId: actor.userId,
      action: "milestone.approve",
      entityType: "Milestone",
      entityId: milestoneId,
      requestId,
      timestamp: new Date().toISOString()
    });
    return ok(requestId, milestone);
  }

  @Post("v1/milestones/:milestoneId/reject")
  @RequirePermissions("milestones:reject")
  reject(@Req() req: { headers?: Record<string, unknown> }, @Param("milestoneId") milestoneId: string, @Body() body: { reason: string }) {
    if (!body.reason) {
      throw new BadRequestException("reason is required");
    }

    const actor = resolveRequestContext(req);
    const requestId = resolveRequestId(req.headers ?? {});
    const milestone = rejectMilestone({
      tenantId: actor.tenantId,
      milestoneId,
      reason: body.reason
    });
    appendAudit({
      id: `aud_${Date.now()}`,
      actorUserId: actor.userId,
      action: "milestone.reject",
      entityType: "Milestone",
      entityId: milestoneId,
      requestId,
      timestamp: new Date().toISOString()
    });
    return ok(requestId, milestone);
  }

}
