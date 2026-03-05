import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import {
  domainStore,
  type AgentRunRecord,
  type BidRecord,
  type EscrowRecord,
  type JobRecord,
  type PaymentTxnRecord,
  type ProjectRecord
} from "./domain-store.js";
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
  ensureProjectForAcceptedBid({
    tenantId: input.tenantId,
    jobId: bid.jobId,
    assignedProOrgId: bid.proOrgId
  });
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

export function findProjectOrThrow(input: { tenantId: string; projectId: string }): ProjectRecord {
  const project = domainStore.projects.find(
    (entry) => entry.id === input.projectId && entry.tenantId === input.tenantId
  );
  if (!project) {
    throw new NotFoundException(`Project '${input.projectId}' not found`);
  }
  return project;
}

export function listProjects(input: {
  tenantId: string;
  status?: ProjectRecord["status"];
  jobId?: string;
}): ProjectRecord[] {
  return domainStore.projects.filter((entry) => {
    if (entry.tenantId !== input.tenantId) {
      return false;
    }
    if (input.status && entry.status !== input.status) {
      return false;
    }
    if (input.jobId && entry.jobId !== input.jobId) {
      return false;
    }
    return true;
  });
}

export function updateProjectStatus(input: {
  tenantId: string;
  projectId: string;
  status: ProjectRecord["status"];
}): ProjectRecord {
  const project = findProjectOrThrow({ tenantId: input.tenantId, projectId: input.projectId });
  const transitions: Record<ProjectRecord["status"], ProjectRecord["status"][]> = {
    open: ["in_progress", "cancelled"],
    in_progress: ["blocked", "completed", "cancelled"],
    blocked: ["in_progress", "cancelled"],
    completed: [],
    cancelled: []
  };

  if (project.status === input.status) {
    return project;
  }

  const allowed = transitions[project.status];
  if (!allowed.includes(input.status)) {
    throw new ConflictException(`invalid transition from ${project.status} to ${input.status}`);
  }

  project.status = input.status;
  return project;
}

export function getEscrowSummary(input: {
  tenantId: string;
  projectId: string;
}): {
  escrow: EscrowRecord | null;
  totalDeposited: number;
  totalReleased: number;
  available: number;
} {
  const escrow =
    domainStore.escrows.find(
      (entry) => entry.projectId === input.projectId && entry.tenantId === input.tenantId
    ) ?? null;

  if (!escrow) {
    return {
      escrow: null,
      totalDeposited: 0,
      totalReleased: 0,
      available: 0
    };
  }

  const related = domainStore.paymentTxns.filter((entry) => entry.escrowId === escrow.id);
  const totalDeposited = related
    .filter((entry) => entry.type === "deposit" && entry.status === "succeeded")
    .reduce((acc, entry) => acc + entry.amount, 0);
  const totalReleased = related
    .filter((entry) => entry.type === "release" && entry.status === "succeeded")
    .reduce((acc, entry) => acc + entry.amount, 0);

  return {
    escrow,
    totalDeposited,
    totalReleased,
    available: totalDeposited - totalReleased
  };
}

export function createEscrowDeposit(input: {
  tenantId: string;
  projectId: string;
  amount: number;
  currency?: string;
}): { escrow: EscrowRecord; transaction: PaymentTxnRecord } {
  if (input.amount <= 0) {
    throw new BadRequestException("deposit amount must be greater than zero");
  }

  const project = findProjectOrThrow({ tenantId: input.tenantId, projectId: input.projectId });
  let escrow = domainStore.escrows.find(
    (entry) => entry.projectId === project.id && entry.tenantId === input.tenantId
  );

  if (!escrow) {
    escrow = {
      id: `esc_${Date.now()}`,
      tenantId: input.tenantId,
      projectId: project.id,
      status: "active",
      totalAmount: 0,
      currency: input.currency ?? "USD"
    };
    domainStore.escrows.push(escrow);
  }

  escrow.totalAmount += input.amount;
  const transaction: PaymentTxnRecord = {
    id: `ptx_${Date.now()}`,
    tenantId: input.tenantId,
    escrowId: escrow.id,
    projectId: project.id,
    type: "deposit",
    amount: input.amount,
    status: "succeeded",
    createdAt: new Date().toISOString()
  };
  domainStore.paymentTxns.unshift(transaction);
  return { escrow, transaction };
}

export function releaseMilestonePayment(input: {
  tenantId: string;
  milestoneId: string;
  projectId: string;
  amount: number;
}): PaymentTxnRecord {
  if (input.amount <= 0) {
    throw new BadRequestException("release amount must be greater than zero");
  }

  const escrow = domainStore.escrows.find(
    (entry) => entry.projectId === input.projectId && entry.tenantId === input.tenantId
  );
  if (!escrow) {
    throw new NotFoundException(`Escrow for project '${input.projectId}' not found`);
  }

  const releasedSoFar = domainStore.paymentTxns
    .filter((entry) => entry.escrowId === escrow.id && entry.type === "release" && entry.status === "succeeded")
    .reduce((acc, entry) => acc + entry.amount, 0);
  const available = escrow.totalAmount - releasedSoFar;

  if (input.amount > available) {
    throw new ConflictException("insufficient escrow funds for release");
  }

  const transaction: PaymentTxnRecord = {
    id: `ptx_${Date.now()}`,
    tenantId: input.tenantId,
    escrowId: escrow.id,
    projectId: input.projectId,
    milestoneId: input.milestoneId,
    type: "release",
    amount: input.amount,
    status: "succeeded",
    createdAt: new Date().toISOString()
  };
  domainStore.paymentTxns.unshift(transaction);
  return transaction;
}

function ensureProjectForAcceptedBid(input: {
  tenantId: string;
  jobId: string;
  assignedProOrgId: string;
}): ProjectRecord {
  const existing = domainStore.projects.find(
    (entry) => entry.tenantId === input.tenantId && entry.jobId === input.jobId
  );
  if (existing) {
    return existing;
  }

  const created: ProjectRecord = {
    id: `prj_${Date.now()}`,
    tenantId: input.tenantId,
    jobId: input.jobId,
    assignedProOrgId: input.assignedProOrgId,
    status: "open"
  };
  domainStore.projects.unshift(created);
  return created;
}
