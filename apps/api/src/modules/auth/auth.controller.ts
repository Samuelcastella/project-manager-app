import { Controller, Get, Req } from "@nestjs/common";
import { ok } from "../../common/api-response.js";
import { resolveRequestId } from "../../common/request-id.js";

@Controller("v1/auth")
export class AuthController {
  @Get("me")
  me(@Req() req: any) {
    return ok(resolveRequestId(req.headers ?? {}), {
      userId: "usr_demo_001",
      email: "ops@semse.local",
      tenantId: "tnt_demo",
      orgId: "org_ops",
      roles: ["OPS_ADMIN"],
      permissions: ["jobs:read", "disputes:write", "audit:read"]
    });
  }
}
