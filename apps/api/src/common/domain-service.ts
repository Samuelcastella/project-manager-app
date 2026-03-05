import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { domainStore, type AgentRunRecord, type BidRecord, type JobRecord } from "./domain-store.js";
import { buildIdempotencyKey, getIdempotentResult, setIdempotentResult } from "./idempotency.store.js";

export function createJob(input: {
  tenantId: string;
  title: string;
  scope: string;
  budgetMin?: number;
  budgetMax?: number;
}): JobRecord {
  const job: JobRecord = {
    id: `job_${Date.now()}`,
    tenantId: input.tenantId,
    title: input.title,
    scope: input.scope,
    status: "published",
    budgetMin: input.budgetMin,
    budgetMax: input.budgetMax
  };

  domainStore.jobs.push(job);
  return job;
}

export function findJobOrThrow(input: { tenantId: string; jobId: string }): JobRecord {
  const job = domainStore.jobs.find((entry) => entry.id === input.jobId && entry.tenantId === input.tenantId);
  if (!job) {
    throw new NotFoundException(`Job '${input.jobId}' not found`);
  }
  return job;
}

export function createBid(input: {
  tenantId: string;
  jobId: string;
  proOrgId: string;
  amount: number;
  etaDays: number;
}): BidRecord {
  const job = findJobOrThrow({ tenantId: input.tenantId, jobId: input.jobId });

  if (job.status !== "published") {
    throw new BadRequestException("bids can only be created for published jobs");
  }

  const duplicate = domainStore.bids.find(
    (entry) =>
      entry.tenantId === input.tenantId &&
      entry.jobId === input.jobId &&
      entry.proOrgId === input.proOrgId &&
      (entry.status === "submitted" || entry.status === "accepted")
  );

  if (duplicate) {
    throw new ConflictException("pro already has an active bid for this job");
  }

  const bid: BidRecord = {
    id: `bid_${Date.now()}`,
    tenantId: input.tenantId,
    jobId: input.jobId,
    proOrgId: input.proOrgId,
    amount: input.amount,
    etaDays: input.etaDays,
    status: "submitted"
  };

  domainStore.bids.push(bid);
  return bid;
}

export function acceptBid(input: { tenantId: string; bidId: string }): BidRecord {
  const bid = domainStore.bids.find((entry) => entry.id === input.bidId && entry.tenantId === input.tenantId);
  if (!bid) {
    throw new NotFoundException(`Bid '${input.bidId}' not found`);
  }

  if (bid.status === "accepted") {
    return bid;
  }

  if (bid.status !== "submitted") {
    throw new BadRequestException(`bid '${bid.id}' is not in submitted state`);
  }

  const job = findJobOrThrow({ tenantId: input.tenantId, jobId: bid.jobId });
  if (job.status !== "published") {
    throw new BadRequestException("job is not eligible for bid acceptance");
  }

  for (const candidate of domainStore.bids) {
    if (candidate.jobId === bid.jobId && candidate.tenantId === input.tenantId && candidate.id !== bid.id) {
      candidate.status = "rejected";
    }
  }

  bid.status = "accepted";
  job.status = "awarded";
  return bid;
}

export function createAgentRun(input: {
  tenantId: string;
  userId: string;
  agentType: AgentRunRecord["agentType"];
  triggerType: AgentRunRecord["triggerType"];
  correlationId: string;
  idempotencyKey?: string;
}): AgentRunRecord {
  if (input.idempotencyKey) {
    const key = buildIdempotencyKey([
      "agent.run.create",
      input.tenantId,
      input.userId,
      input.agentType,
      input.correlationId,
      input.idempotencyKey
    ]);

    const existing = getIdempotentResult<AgentRunRecord>(key);
    if (existing) {
      return existing;
    }

    const created = createAgentRunRecord(input);
    setIdempotentResult(key, created);
    return created;
  }

  return createAgentRunRecord(input);
}

function createAgentRunRecord(input: {
  tenantId: string;
  agentType: AgentRunRecord["agentType"];
  triggerType: AgentRunRecord["triggerType"];
  correlationId: string;
}): AgentRunRecord {
  const run: AgentRunRecord = {
    id: `run_${Date.now()}`,
    tenantId: input.tenantId,
    agentType: input.agentType,
    triggerType: input.triggerType,
    correlationId: input.correlationId,
    status: "queued",
    createdAt: new Date().toISOString()
  };

  domainStore.agentRuns.unshift(run);
  return run;
}

export function retryAgentRun(input: { tenantId: string; runId: string }): AgentRunRecord {
  const run = domainStore.agentRuns.find((entry) => entry.id === input.runId && entry.tenantId === input.tenantId);
  if (!run) {
    throw new NotFoundException(`Agent run '${input.runId}' not found`);
  }

  if (run.status === "running") {
    throw new BadRequestException("running run cannot be retried");
  }

  run.status = "queued";
  return run;
}
