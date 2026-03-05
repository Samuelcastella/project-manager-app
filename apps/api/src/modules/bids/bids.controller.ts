import { Body, Controller, Get, Param, Post } from "@nestjs/common";

type Bid = {
  id: string;
  jobId: string;
  proOrgId: string;
  amount: number;
  etaDays: number;
  status: "submitted" | "accepted" | "rejected";
};

const bids: Bid[] = [];

@Controller()
export class BidsController {
  @Get("v1/jobs/:jobId/bids")
  list(@Param("jobId") jobId: string): Bid[] {
    return bids.filter((bid) => bid.jobId === jobId);
  }

  @Post("v1/jobs/:jobId/bids")
  create(
    @Param("jobId") jobId: string,
    @Body() body: Pick<Bid, "proOrgId" | "amount" | "etaDays">
  ): Bid {
    const bid: Bid = {
      id: `bid_${Date.now()}`,
      jobId,
      proOrgId: body.proOrgId,
      amount: body.amount,
      etaDays: body.etaDays,
      status: "submitted"
    };

    bids.push(bid);
    return bid;
  }

  @Post("v1/bids/:bidId/accept")
  accept(@Param("bidId") bidId: string): { bidId: string; status: string } {
    const bid = bids.find((entry) => entry.id === bidId);
    if (bid) {
      bid.status = "accepted";
    }
    return { bidId, status: bid?.status ?? "not_found" };
  }
}
