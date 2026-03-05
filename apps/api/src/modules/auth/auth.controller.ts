import { Controller, Get, Req } from "@nestjs/common";
import { ok } from "../../common/api-response.js";
import { resolveRequestContext } from "../../common/request-context.js";
import { resolveRequestId } from "../../common/request-id.js";

@Controller("v1/auth")
export class AuthController {
  @Get("me")
  me(@Req() req: { headers?: Record<string, unknown> }) {
    const actor = resolveRequestContext(req);

    return ok(resolveRequestId(req.headers ?? {}), {
      userId: actor.userId,
      tenantId: actor.tenantId,
      orgId: actor.orgId,
      roles: actor.roles
    });
  }
}
