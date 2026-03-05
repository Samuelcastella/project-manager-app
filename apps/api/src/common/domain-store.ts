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
  disputes: [] as DisputeRecord[],
  agentRuns: [] as AgentRunRecord[]
};
