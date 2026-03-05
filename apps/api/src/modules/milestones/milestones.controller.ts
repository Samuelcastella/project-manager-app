import { BadRequestException, Body, Controller, Param, Patch, Post, Req } from "@nestjs/common";
import { ok } from "../../common/api-response.js";
import { appendAudit } from "../../common/audit-log.store.js";
import { resolveRequestId } from "../../common/request-id.js";

@Controller()
export class MilestonesController {
  @Post("v1/projects/:projectId/milestones")
  create(@Req() req: any, @Param("projectId") projectId: string, @Body() body: { title: string; amount: number; sequence: number; actorUserId?: string }) {
    const requestId = resolveRequestId(req.headers ?? {});
    const id = `ms_${Date.now()}`;
    appendAudit({
      id: `aud_${Date.now()}`,
      actorUserId: body.actorUserId ?? "usr_demo_001",
      action: "milestone.create",
      entityType: "Milestone",
      entityId: id,
      requestId,
      timestamp: new Date().toISOString()
    });

    return ok(requestId, {
      id,
      projectId,
      title: body.title,
      amount: body.amount,
      sequence: body.sequence,
      status: "draft"
    });
  }

  @Post("v1/milestones/:milestoneId/submit")
  submit(@Req() req: any, @Param("milestoneId") milestoneId: string, @Body() body: { actorUserId?: string }) {
    const requestId = resolveRequestId(req.headers ?? {});
    appendAudit({
      id: `aud_${Date.now()}`,
      actorUserId: body.actorUserId ?? "usr_demo_001",
      action: "milestone.submit",
      entityType: "Milestone",
      entityId: milestoneId,
      requestId,
      timestamp: new Date().toISOString()
    });
    return ok(requestId, { milestoneId, status: "submitted" });
  }

  @Post("v1/milestones/:milestoneId/approve")
  approve(@Req() req: any, @Param("milestoneId") milestoneId: string, @Body() body: { actorUserId?: string }) {
    const requestId = resolveRequestId(req.headers ?? {});
    appendAudit({
      id: `aud_${Date.now()}`,
      actorUserId: body.actorUserId ?? "usr_demo_001",
      action: "milestone.approve",
      entityType: "Milestone",
      entityId: milestoneId,
      requestId,
      timestamp: new Date().toISOString()
    });
    return ok(requestId, { milestoneId, status: "approved" });
  }

  @Post("v1/milestones/:milestoneId/reject")
  reject(@Req() req: any, @Param("milestoneId") milestoneId: string, @Body() body: { reason: string; actorUserId?: string }) {
    if (!body.reason) {
      throw new BadRequestException("reason is required");
    }

    const requestId = resolveRequestId(req.headers ?? {});
    appendAudit({
      id: `aud_${Date.now()}`,
      actorUserId: body.actorUserId ?? "usr_demo_001",
      action: "milestone.reject",
      entityType: "Milestone",
      entityId: milestoneId,
      requestId,
      timestamp: new Date().toISOString()
    });
    return ok(requestId, { milestoneId, status: "rejected", reason: body.reason });
  }

  @Patch("v1/projects/:projectId/status")
  updateProjectStatus(@Req() req: any, @Param("projectId") projectId: string, @Body() body: { status: string; actorUserId?: string }) {
    if (!body.status) {
      throw new BadRequestException("status is required");
    }

    const requestId = resolveRequestId(req.headers ?? {});
    appendAudit({
      id: `aud_${Date.now()}`,
      actorUserId: body.actorUserId ?? "usr_demo_001",
      action: "project.status.update",
      entityType: "Project",
      entityId: projectId,
      requestId,
      timestamp: new Date().toISOString()
    });
    return ok(requestId, { projectId, status: body.status });
  }
}
