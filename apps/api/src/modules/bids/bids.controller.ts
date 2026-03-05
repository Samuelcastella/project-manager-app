import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Req } from "@nestjs/common";
import { z } from "zod";
import { ok } from "../../common/api-response.js";
import { appendAudit } from "../../common/audit-log.store.js";
import { resolveRequestId } from "../../common/request-id.js";

type Bid = {
  id: string;
  jobId: string;
  proOrgId: string;
  amount: number;
  etaDays: number;
  status: "submitted" | "accepted" | "rejected";
};

const createBidSchema = z.object({
  actorUserId: z.string().min(1).default("usr_demo_001"),
  proOrgId: z.string().min(1),
  amount: z.number().positive(),
  etaDays: z.number().int().positive()
});

const bids: Bid[] = [];

@Controller()
export class BidsController {
  @Get("v1/jobs/:jobId/bids")
  list(@Req() req: any, @Param("jobId") jobId: string) {
    return ok(resolveRequestId(req.headers ?? {}), bids.filter((bid) => bid.jobId === jobId));
  }

  @Post("v1/jobs/:jobId/bids")
  create(@Req() req: any, @Param("jobId") jobId: string, @Body() body: Record<string, unknown>) {
    const parsed = createBidSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const input = parsed.data;
    const requestId = resolveRequestId(req.headers ?? {});
    const bid: Bid = {
      id: `bid_${Date.now()}`,
      jobId,
      proOrgId: input.proOrgId,
      amount: input.amount,
      etaDays: input.etaDays,
      status: "submitted"
    };

    bids.push(bid);
    appendAudit({
      id: `aud_${Date.now()}`,
      actorUserId: input.actorUserId,
      action: "bid.create",
      entityType: "Bid",
      entityId: bid.id,
      requestId,
      timestamp: new Date().toISOString()
    });

    return ok(requestId, bid);
  }

  @Post("v1/bids/:bidId/accept")
  accept(@Req() req: any, @Param("bidId") bidId: string, @Body() body: { actorUserId?: string }) {
    const bid = bids.find((entry) => entry.id === bidId);
    if (!bid) {
      throw new NotFoundException(`Bid '${bidId}' not found`);
    }

    bid.status = "accepted";
    const requestId = resolveRequestId(req.headers ?? {});
    appendAudit({
      id: `aud_${Date.now()}`,
      actorUserId: body.actorUserId ?? "usr_demo_001",
      action: "bid.accept",
      entityType: "Bid",
      entityId: bid.id,
      requestId,
      timestamp: new Date().toISOString()
    });

    return ok(requestId, bid);
  }
}
