import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Req } from "@nestjs/common";
import { z } from "zod";
import { ok } from "../../common/api-response.js";
import { appendAudit } from "../../common/audit-log.store.js";
import { domainStore, type BidRecord } from "../../common/domain-store.js";
import { RequirePermissions } from "../../common/permissions.decorator.js";
import { resolveRequestContext } from "../../common/request-context.js";
import { resolveRequestId } from "../../common/request-id.js";

const createBidSchema = z.object({
  proOrgId: z.string().min(1),
  amount: z.number().positive(),
  etaDays: z.number().int().positive()
});

@Controller()
export class BidsController {
  @Get("v1/jobs/:jobId/bids")
  @RequirePermissions("bids:read")
  list(@Req() req: { headers?: Record<string, unknown> }, @Param("jobId") jobId: string) {
    const actor = resolveRequestContext(req);
    const data = domainStore.bids.filter((bid) => bid.jobId === jobId && bid.tenantId === actor.tenantId);
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
    const job = domainStore.jobs.find((entry) => entry.id === jobId && entry.tenantId === actor.tenantId);
    if (!job) {
      throw new NotFoundException(`Job '${jobId}' not found`);
    }
    if (job.status !== "published") {
      throw new BadRequestException("bids can only be created for published jobs");
    }

    const requestId = resolveRequestId(req.headers ?? {});
    const bid: BidRecord = {
      id: `bid_${Date.now()}`,
      jobId,
      tenantId: actor.tenantId,
      proOrgId: parsed.data.proOrgId,
      amount: parsed.data.amount,
      etaDays: parsed.data.etaDays,
      status: "submitted"
    };

    domainStore.bids.push(bid);
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
    const bid = domainStore.bids.find((entry) => entry.id === bidId && entry.tenantId === actor.tenantId);
    if (!bid) {
      throw new NotFoundException(`Bid '${bidId}' not found`);
    }

    const job = domainStore.jobs.find((entry) => entry.id === bid.jobId && entry.tenantId === actor.tenantId);
    if (!job) {
      throw new NotFoundException(`Job '${bid.jobId}' not found`);
    }

    if (job.status !== "published") {
      throw new BadRequestException("job is not eligible for bid acceptance");
    }

    for (const candidate of domainStore.bids) {
      if (candidate.jobId === bid.jobId && candidate.tenantId === actor.tenantId && candidate.id !== bid.id) {
        candidate.status = "rejected";
      }
    }
    bid.status = "accepted";
    job.status = "awarded";
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
