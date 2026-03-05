import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Req } from "@nestjs/common";
import { z } from "zod";
import { ok } from "../../common/api-response.js";
import { appendAudit } from "../../common/audit-log.store.js";
import { domainStore, type DisputeRecord } from "../../common/domain-store.js";
import { RequirePermissions } from "../../common/permissions.decorator.js";
import { resolveRequestContext } from "../../common/request-context.js";
import { resolveRequestId } from "../../common/request-id.js";

const createDisputeSchema = z.object({
  projectId: z.string().min(1),
  reason: z.string().min(5).max(1000)
});

@Controller("v1/disputes")
export class DisputesController {
  @Get()
  @RequirePermissions("disputes:create")
  list(@Req() req: { headers?: Record<string, unknown> }) {
    const actor = resolveRequestContext(req);
    return ok(
      resolveRequestId(req.headers ?? {}),
      domainStore.disputes.filter((entry) => entry.tenantId === actor.tenantId)
    );
  }

  @Post()
  @RequirePermissions("disputes:create")
  create(@Req() req: { headers?: Record<string, unknown> }, @Body() body: Record<string, unknown>) {
    const parsed = createDisputeSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const actor = resolveRequestContext(req);
    const requestId = resolveRequestId(req.headers ?? {});
    const dispute: DisputeRecord = {
      id: `dsp_${Date.now()}`,
      tenantId: actor.tenantId,
      projectId: parsed.data.projectId,
      reason: parsed.data.reason,
      status: "open"
    };

    domainStore.disputes.unshift(dispute);
    appendAudit({
      id: `aud_${Date.now()}`,
      actorUserId: actor.userId,
      action: "dispute.create",
      entityType: "Dispute",
      entityId: dispute.id,
      requestId,
      timestamp: new Date().toISOString()
    });

    return ok(requestId, dispute);
  }

  @Post(":disputeId/assign")
  @RequirePermissions("disputes:assign")
  assign(@Req() req: { headers?: Record<string, unknown> }, @Param("disputeId") disputeId: string, @Body() body: { assigneeUserId: string }) {
    const actor = resolveRequestContext(req);
    const dispute = domainStore.disputes.find((entry) => entry.id === disputeId && entry.tenantId === actor.tenantId);
    if (!dispute) {
      throw new NotFoundException(`Dispute '${disputeId}' not found`);
    }

    if (!body.assigneeUserId) {
      throw new BadRequestException("assigneeUserId is required");
    }

    dispute.assigneeUserId = body.assigneeUserId;
    dispute.status = "assigned";
    const requestId = resolveRequestId(req.headers ?? {});
    appendAudit({
      id: `aud_${Date.now()}`,
      actorUserId: actor.userId,
      action: "dispute.assign",
      entityType: "Dispute",
      entityId: dispute.id,
      requestId,
      timestamp: new Date().toISOString()
    });

    return ok(requestId, dispute);
  }

  @Post(":disputeId/resolve")
  @RequirePermissions("disputes:resolve")
  resolve(@Req() req: { headers?: Record<string, unknown> }, @Param("disputeId") disputeId: string, @Body() body: { resolution: string }) {
    const actor = resolveRequestContext(req);
    const dispute = domainStore.disputes.find((entry) => entry.id === disputeId && entry.tenantId === actor.tenantId);
    if (!dispute) {
      throw new NotFoundException(`Dispute '${disputeId}' not found`);
    }

    if (!body.resolution) {
      throw new BadRequestException("resolution is required");
    }

    dispute.status = "resolved";
    dispute.resolution = body.resolution;
    const requestId = resolveRequestId(req.headers ?? {});
    appendAudit({
      id: `aud_${Date.now()}`,
      actorUserId: actor.userId,
      action: "dispute.resolve",
      entityType: "Dispute",
      entityId: dispute.id,
      requestId,
      timestamp: new Date().toISOString()
    });

    return ok(requestId, dispute);
  }
}
