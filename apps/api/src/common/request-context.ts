export type RequestLike = {
  headers?: Record<string, unknown>;
};

export type RequestContext = {
  userId: string;
  tenantId: string;
  orgId: string;
  roles: string[];
};

function parseRoles(raw: unknown): string[] {
  if (typeof raw !== "string") {
    return ["OPS_ADMIN"];
  }

  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function resolveRequestContext(req: RequestLike): RequestContext {
  const headers = req.headers ?? {};

  return {
    userId: typeof headers["x-user-id"] === "string" ? headers["x-user-id"] : "usr_demo_001",
    tenantId: typeof headers["x-tenant-id"] === "string" ? headers["x-tenant-id"] : "tnt_demo",
    orgId: typeof headers["x-org-id"] === "string" ? headers["x-org-id"] : "org_ops",
    roles: parseRoles(headers["x-roles"])
  };
}
