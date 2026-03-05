export const rolePermissions: Record<string, string[]> = {
  CLIENT: ["jobs:read", "jobs:create", "bids:read", "milestones:approve", "disputes:create"],
  PRO: ["jobs:read", "bids:create", "milestones:submit", "evidence:write"],
  OPS_ADMIN: [
    "jobs:read",
    "jobs:create",
    "bids:read",
    "bids:create",
    "bids:accept",
    "milestones:approve",
    "milestones:reject",
    "evidence:write",
    "disputes:create",
    "disputes:assign",
    "disputes:resolve",
    "ops:audit:read",
    "ops:risk:read",
    "agents:run:create",
    "agents:run:retry"
  ]
};

export function hasPermission(roles: string[], permission: string): boolean {
  return roles.some((role) => rolePermissions[role]?.includes(permission));
}
