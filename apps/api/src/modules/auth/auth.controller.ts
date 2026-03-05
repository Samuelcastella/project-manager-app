import { Controller, Get } from "@nestjs/common";

@Controller("v1/auth")
export class AuthController {
  @Get("me")
  me(): {
    userId: string;
    email: string;
    tenantId: string;
    orgId: string;
    roles: string[];
    permissions: string[];
  } {
    // Placeholder stub for phase 0. Replace with real session + RBAC resolution.
    return {
      userId: "usr_demo_001",
      email: "ops@semse.local",
      tenantId: "tnt_demo",
      orgId: "org_ops",
      roles: ["OPS_ADMIN"],
      permissions: ["jobs:read", "disputes:write", "audit:read"]
    };
  }
}
