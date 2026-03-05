import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Req } from "@nestjs/common";
import { z } from "zod";
import { ok } from "../../common/api-response.js";
import { appendAudit } from "../../common/audit-log.store.js";
import { resolveRequestId } from "../../common/request-id.js";

type Dispute = {
  id: string;
  projectId: string;
  reason: string;
  status: "open" | "assigned" | "resolved";
  assigneeUserId?: string;
  resolution?: string;
};

const createDisputeSchema = z.object({
  actorUserId: z.string().min(1).default("usr_demo_001"),
  projectId: z.string().min(1),
  reason: z.string().min(5).max(1000)
});

const disputes: Dispute[] = [];

@Controller("v1/disputes")
export class DisputesController {
  @Get()
  list(@Req() req: any) {
    return ok(resolveRequestId(req.headers ?? {}), disputes);
  }

  @Post()
  create(@Req() req: any, @Body() body: Record<string, unknown>) {
    const parsed = createDisputeSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const input = parsed.data;
    const requestId = resolveRequestId(req.headers ?? {});
    const dispute: Dispute = {
      id: `dsp_${Date.now()}`,
      projectId: input.projectId,
      reason: input.reason,
      status: "open"
    };

    disputes.unshift(dispute);
    appendAudit({
      id: `aud_${Date.now()}`,
      actorUserId: input.actorUserId,
      action: "dispute.create",
      entityType: "Dispute",
      entityId: dispute.id,
      requestId,
      timestamp: new Date().toISOString()
    });

    return ok(requestId, dispute);
  }

  @Post(":disputeId/assign")
  assign(@Req() req: any, @Param("disputeId") disputeId: string, @Body() body: { assigneeUserId: string; actorUserId?: string }) {
    const dispute = disputes.find((entry) => entry.id === disputeId);
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
      actorUserId: body.actorUserId ?? "usr_demo_001",
      action: "dispute.assign",
      entityType: "Dispute",
      entityId: dispute.id,
      requestId,
      timestamp: new Date().toISOString()
    });

    return ok(requestId, dispute);
  }

  @Post(":disputeId/resolve")
  resolve(@Req() req: any, @Param("disputeId") disputeId: string, @Body() body: { resolution: string; actorUserId?: string }) {
    const dispute = disputes.find((entry) => entry.id === disputeId);
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
      actorUserId: body.actorUserId ?? "usr_demo_001",
      action: "dispute.resolve",
      entityType: "Dispute",
      entityId: dispute.id,
      requestId,
      timestamp: new Date().toISOString()
    });

    return ok(requestId, dispute);
  }
}
