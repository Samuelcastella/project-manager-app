import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import {
  type DisputeRecord,
  domainStore,
  type AgentRunRecord,
  type BidRecord,
  type EscrowRecord,
  type JobRecord,
  type MilestoneRecord,
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
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
  run.error = undefined;
  run.updatedAt = new Date().toISOString();
  return run;
}

export function startAgentRun(input: { tenantId: string; runId: string }): AgentRunRecord {
  const run = findAgentRunOrThrow(input);
  if (run.status === "running") {
    return run;
  }
  if (run.status !== "queued") {
    throw new ConflictException(`cannot start run in status '${run.status}'`);
  }
  run.status = "running";
  run.updatedAt = new Date().toISOString();
  return run;
}

export function completeAgentRun(input: {
  tenantId: string;
  runId: string;
  output?: Record<string, unknown>;
}): AgentRunRecord {
  const run = findAgentRunOrThrow(input);
  if (run.status === "completed") {
    return run;
  }
  if (run.status !== "running") {
    throw new ConflictException(`cannot complete run in status '${run.status}'`);
  }
  run.status = "completed";
  run.output = input.output;
  run.error = undefined;
  run.updatedAt = new Date().toISOString();
  return run;
}

export function failAgentRun(input: {
  tenantId: string;
  runId: string;
  error: string;
}): AgentRunRecord {
  const run = findAgentRunOrThrow(input);
  if (run.status === "failed") {
    return run;
  }
  if (run.status !== "running") {
    throw new ConflictException(`cannot fail run in status '${run.status}'`);
  }
  run.status = "failed";
  run.error = input.error;
  run.updatedAt = new Date().toISOString();
  return run;
}

export function listDisputes(input: { tenantId: string }): DisputeRecord[] {
  return domainStore.disputes.filter((entry) => entry.tenantId === input.tenantId);
}

export function createDispute(input: {
  tenantId: string;
  projectId: string;
  reason: string;
}): DisputeRecord {
  findProjectOrThrow({ tenantId: input.tenantId, projectId: input.projectId });
  const openForProject = domainStore.disputes.find(
    (entry) =>
      entry.tenantId === input.tenantId &&
      entry.projectId === input.projectId &&
      (entry.status === "open" || entry.status === "assigned")
  );
  if (openForProject) {
    throw new ConflictException("an open dispute already exists for this project");
  }

  const dispute: DisputeRecord = {
    id: `dsp_${Date.now()}`,
    tenantId: input.tenantId,
    projectId: input.projectId,
    reason: input.reason,
    status: "open"
  };
  domainStore.disputes.unshift(dispute);
  return dispute;
}

export function assignDispute(input: {
  tenantId: string;
  disputeId: string;
  assigneeUserId: string;
}): DisputeRecord {
  const dispute = findDisputeOrThrow({ tenantId: input.tenantId, disputeId: input.disputeId });
  if (dispute.status === "resolved") {
    throw new ConflictException("cannot assign a resolved dispute");
  }
  dispute.assigneeUserId = input.assigneeUserId;
  dispute.status = "assigned";
  return dispute;
}

export function resolveDispute(input: {
  tenantId: string;
  disputeId: string;
  resolution: string;
}): DisputeRecord {
  const dispute = findDisputeOrThrow({ tenantId: input.tenantId, disputeId: input.disputeId });
  if (dispute.status === "resolved") {
    return dispute;
  }

  dispute.status = "resolved";
  dispute.resolution = input.resolution;
  return dispute;
}

export function getOpsDashboard(input: { tenantId: string }): {
  jobs: { total: number; published: number; awarded: number };
  projects: { total: number; open: number; inProgress: number; blocked: number; completed: number };
  disputes: { total: number; open: number; assigned: number; resolved: number };
  agents: { totalRuns: number; queued: number; running: number; failed: number };
} {
  const jobs = domainStore.jobs.filter((entry) => entry.tenantId === input.tenantId);
  const projects = domainStore.projects.filter((entry) => entry.tenantId === input.tenantId);
  const disputes = domainStore.disputes.filter((entry) => entry.tenantId === input.tenantId);
  const runs = domainStore.agentRuns.filter((entry) => entry.tenantId === input.tenantId);

  return {
    jobs: {
      total: jobs.length,
      published: jobs.filter((entry) => entry.status === "published").length,
      awarded: jobs.filter((entry) => entry.status === "awarded").length
    },
    projects: {
      total: projects.length,
      open: projects.filter((entry) => entry.status === "open").length,
      inProgress: projects.filter((entry) => entry.status === "in_progress").length,
      blocked: projects.filter((entry) => entry.status === "blocked").length,
      completed: projects.filter((entry) => entry.status === "completed").length
    },
    disputes: {
      total: disputes.length,
      open: disputes.filter((entry) => entry.status === "open").length,
      assigned: disputes.filter((entry) => entry.status === "assigned").length,
      resolved: disputes.filter((entry) => entry.status === "resolved").length
    },
    agents: {
      totalRuns: runs.length,
      queued: runs.filter((entry) => entry.status === "queued").length,
      running: runs.filter((entry) => entry.status === "running").length,
      failed: runs.filter((entry) => entry.status === "failed").length
    }
  };
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

export function createMilestone(input: {
  tenantId: string;
  projectId: string;
  title: string;
  amount: number;
  sequence: number;
}): MilestoneRecord {
  findProjectOrThrow({ tenantId: input.tenantId, projectId: input.projectId });
  if (input.amount <= 0) {
    throw new BadRequestException("milestone amount must be greater than zero");
  }

  const duplicateSequence = domainStore.milestones.find(
    (entry) =>
      entry.tenantId === input.tenantId &&
      entry.projectId === input.projectId &&
      entry.sequence === input.sequence
  );
  if (duplicateSequence) {
    throw new ConflictException(`milestone sequence '${input.sequence}' already exists`);
  }

  const milestone: MilestoneRecord = {
    id: `ms_${Date.now()}`,
    tenantId: input.tenantId,
    projectId: input.projectId,
    title: input.title,
    amount: input.amount,
    sequence: input.sequence,
    status: "draft"
  };
  domainStore.milestones.push(milestone);
  return milestone;
}

export function listMilestonesByProject(input: {
  tenantId: string;
  projectId: string;
}): MilestoneRecord[] {
  return domainStore.milestones
    .filter((entry) => entry.tenantId === input.tenantId && entry.projectId === input.projectId)
    .sort((a, b) => a.sequence - b.sequence);
}

export function findMilestoneOrThrow(input: {
  tenantId: string;
  milestoneId: string;
}): MilestoneRecord {
  const milestone = domainStore.milestones.find(
    (entry) => entry.tenantId === input.tenantId && entry.id === input.milestoneId
  );
  if (!milestone) {
    throw new NotFoundException(`Milestone '${input.milestoneId}' not found`);
  }
  return milestone;
}

export function submitMilestone(input: {
  tenantId: string;
  milestoneId: string;
}): MilestoneRecord {
  const milestone = findMilestoneOrThrow(input);
  if (milestone.status === "submitted" || milestone.status === "approved" || milestone.status === "paid") {
    return milestone;
  }
  if (milestone.status !== "draft" && milestone.status !== "rejected") {
    throw new ConflictException(`cannot submit milestone in status '${milestone.status}'`);
  }
  milestone.status = "submitted";
  milestone.rejectionReason = undefined;
  return milestone;
}

export function approveMilestone(input: {
  tenantId: string;
  milestoneId: string;
}): MilestoneRecord {
  const milestone = findMilestoneOrThrow(input);
  if (milestone.status === "approved" || milestone.status === "paid") {
    return milestone;
  }
  if (milestone.status !== "submitted") {
    throw new ConflictException(`cannot approve milestone in status '${milestone.status}'`);
  }
  milestone.status = "approved";
  milestone.rejectionReason = undefined;
  return milestone;
}

export function rejectMilestone(input: {
  tenantId: string;
  milestoneId: string;
  reason: string;
}): MilestoneRecord {
  const milestone = findMilestoneOrThrow(input);
  if (milestone.status === "paid") {
    throw new ConflictException("cannot reject milestone in paid status");
  }
  if (milestone.status !== "submitted" && milestone.status !== "approved") {
    throw new ConflictException(`cannot reject milestone in status '${milestone.status}'`);
  }
  milestone.status = "rejected";
  milestone.rejectionReason = input.reason;
  return milestone;
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
  amount?: number;
}): PaymentTxnRecord {
  const milestone = findMilestoneOrThrow({
    tenantId: input.tenantId,
    milestoneId: input.milestoneId
  });
  if (milestone.status !== "approved") {
    throw new ConflictException(`milestone '${milestone.id}' must be approved before release`);
  }
  const amount = input.amount ?? milestone.amount;
  if (amount <= 0) {
    throw new BadRequestException("release amount must be greater than zero");
  }

  const escrow = domainStore.escrows.find(
    (entry) => entry.projectId === milestone.projectId && entry.tenantId === input.tenantId
  );
  if (!escrow) {
    throw new NotFoundException(`Escrow for project '${milestone.projectId}' not found`);
  }

  const releasedSoFar = domainStore.paymentTxns
    .filter((entry) => entry.escrowId === escrow.id && entry.type === "release" && entry.status === "succeeded")
    .reduce((acc, entry) => acc + entry.amount, 0);
  const available = escrow.totalAmount - releasedSoFar;

  if (amount > available) {
    throw new ConflictException("insufficient escrow funds for release");
  }

  const transaction: PaymentTxnRecord = {
    id: `ptx_${Date.now()}`,
    tenantId: input.tenantId,
    escrowId: escrow.id,
    projectId: milestone.projectId,
    milestoneId: input.milestoneId,
    type: "release",
    amount,
    status: "succeeded",
    createdAt: new Date().toISOString()
  };
  domainStore.paymentTxns.unshift(transaction);
  milestone.status = "paid";
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

function findDisputeOrThrow(input: { tenantId: string; disputeId: string }): DisputeRecord {
  const dispute = domainStore.disputes.find(
    (entry) => entry.tenantId === input.tenantId && entry.id === input.disputeId
  );
  if (!dispute) {
    throw new NotFoundException(`Dispute '${input.disputeId}' not found`);
  }
  return dispute;
}

function findAgentRunOrThrow(input: { tenantId: string; runId: string }): AgentRunRecord {
  const run = domainStore.agentRuns.find(
    (entry) => entry.tenantId === input.tenantId && entry.id === input.runId
  );
  if (!run) {
    throw new NotFoundException(`Agent run '${input.runId}' not found`);
  }
  return run;
}
