import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Req } from "@nestjs/common";
import { z } from "zod";
import { ok } from "../../common/api-response.js";
import { appendAudit } from "../../common/audit-log.store.js";
import { RequirePermissions } from "../../common/permissions.decorator.js";
import { resolveRequestContext } from "../../common/request-context.js";
import { resolveRequestId } from "../../common/request-id.js";

type Bid = {
  id: string;
  jobId: string;
  tenantId: string;
  proOrgId: string;
  amount: number;
  etaDays: number;
  status: "submitted" | "accepted" | "rejected";
};

const createBidSchema = z.object({
  proOrgId: z.string().min(1),
  amount: z.number().positive(),
  etaDays: z.number().int().positive()
});

const bids: Bid[] = [];

@Controller()
export class BidsController {
  @Get("v1/jobs/:jobId/bids")
  @RequirePermissions("bids:read")
  list(@Req() req: { headers?: Record<string, unknown> }, @Param("jobId") jobId: string) {
    const actor = resolveRequestContext(req);
    const data = bids.filter((bid) => bid.jobId === jobId && bid.tenantId === actor.tenantId);
    return ok(resolveRequestId(req.headers ?? {}), data);
  }

  @Post("v1/jobs/:jobId/bids")
  @RequirePermissions("bids:create")
  create(@Req() req: { headers?: Record<string, unknown> }, @Param("jobId") jobId: string, @Body() body: Record<string, unknown>) {
    const parsed = createBidSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const actor = resolveRequestContext(req);
    const requestId = resolveRequestId(req.headers ?? {});
    const bid: Bid = {
      id: `bid_${Date.now()}`,
      jobId,
      tenantId: actor.tenantId,
      proOrgId: parsed.data.proOrgId,
      amount: parsed.data.amount,
      etaDays: parsed.data.etaDays,
      status: "submitted"
    };

    bids.push(bid);
    appendAudit({
      id: `aud_${Date.now()}`,
      actorUserId: actor.userId,
      action: "bid.create",
      entityType: "Bid",
      entityId: bid.id,
      requestId,
      timestamp: new Date().toISOString()
    });

    return ok(requestId, bid);
  }

  @Post("v1/bids/:bidId/accept")
  @RequirePermissions("bids:accept")
  accept(@Req() req: { headers?: Record<string, unknown> }, @Param("bidId") bidId: string) {
    const actor = resolveRequestContext(req);
    const bid = bids.find((entry) => entry.id === bidId && entry.tenantId === actor.tenantId);
    if (!bid) {
      throw new NotFoundException(`Bid '${bidId}' not found`);
    }

    bid.status = "accepted";
    const requestId = resolveRequestId(req.headers ?? {});
    appendAudit({
      id: `aud_${Date.now()}`,
      actorUserId: actor.userId,
      action: "bid.accept",
      entityType: "Bid",
      entityId: bid.id,
      requestId,
      timestamp: new Date().toISOString()
    });

    return ok(requestId, bid);
  }
}
