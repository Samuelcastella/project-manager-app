export type AuditEntry = {
  id: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  timestamp: string;
  requestId: string;
};

const auditEntries: AuditEntry[] = [];

export function appendAudit(entry: AuditEntry): void {
  auditEntries.unshift(entry);
}

export function listAudit(limit = 100): AuditEntry[] {
  return auditEntries.slice(0, limit);
}
