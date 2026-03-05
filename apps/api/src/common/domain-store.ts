export type JobRecord = {
  id: string;
  tenantId: string;
  title: string;
  scope: string;
  status: "draft" | "published" | "awarded" | "cancelled";
  budgetMin?: number;
  budgetMax?: number;
};

export type BidRecord = {
  id: string;
  jobId: string;
  tenantId: string;
  proOrgId: string;
  amount: number;
  etaDays: number;
  status: "submitted" | "accepted" | "rejected";
};

export type DisputeRecord = {
  id: string;
  tenantId: string;
  projectId: string;
  reason: string;
  status: "open" | "assigned" | "resolved";
  assigneeUserId?: string;
  resolution?: string;
};

export type ProjectRecord = {
  id: string;
  tenantId: string;
  jobId: string;
  assignedProOrgId: string;
  status: "open" | "in_progress" | "blocked" | "completed" | "cancelled";
};

export type MilestoneRecord = {
  id: string;
  tenantId: string;
  projectId: string;
  title: string;
  amount: number;
  sequence: number;
  status: "draft" | "submitted" | "approved" | "rejected" | "paid";
  rejectionReason?: string;
};

export type EscrowRecord = {
  id: string;
  tenantId: string;
  projectId: string;
  status: "active" | "closed";
  totalAmount: number;
  currency: string;
};

export type PaymentTxnRecord = {
  id: string;
  tenantId: string;
  escrowId: string;
  projectId: string;
  milestoneId?: string;
  type: "deposit" | "release" | "holdback" | "fee" | "refund";
  amount: number;
  status: "pending" | "succeeded" | "failed";
  createdAt: string;
};

export type AgentRunRecord = {
  id: string;
  tenantId: string;
  agentType: "pricing" | "job-planner" | "evidence-coach" | "risk" | "dispute";
  status: "queued" | "running" | "completed" | "failed";
  triggerType: "manual" | "event" | "schedule";
  correlationId: string;
  createdAt: string;
};

export const domainStore = {
  jobs: [] as JobRecord[],
  bids: [] as BidRecord[],
  projects: [] as ProjectRecord[],
  milestones: [] as MilestoneRecord[],
  escrows: [] as EscrowRecord[],
  paymentTxns: [] as PaymentTxnRecord[],
  disputes: [] as DisputeRecord[],
  agentRuns: [] as AgentRunRecord[]
};
