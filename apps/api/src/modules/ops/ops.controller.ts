import { Controller, Get, Param, Post, Req } from "@nestjs/common";
import { ok } from "../../common/api-response.js";
import { listAudit } from "../../common/audit-log.store.js";
import { getOpsDashboard } from "../../common/domain-service.js";
import { RequirePermissions } from "../../common/permissions.decorator.js";
import { resolveRequestContext } from "../../common/request-context.js";
import { resolveRequestId } from "../../common/request-id.js";

@Controller("v1/ops")
export class OpsController {
  @Get("audit")
  @RequirePermissions("ops:audit:read")
  audit(@Req() req: { headers?: Record<string, unknown> }) {
    return ok(resolveRequestId(req.headers ?? {}), listAudit());
  }

  @Get("risk-scores")
  @RequirePermissions("ops:risk:read")
  riskScores(@Req() req: { headers?: Record<string, unknown> }) {
    const data = [{ subjectType: "project", subjectId: "prj_demo", score: 0.22 }];
    return ok(resolveRequestId(req.headers ?? {}), data);
  }

  @Get("dashboard")
  @RequirePermissions("ops:dashboard:read")
  dashboard(@Req() req: { headers?: Record<string, unknown> }) {
    const actor = resolveRequestContext(req);
    return ok(resolveRequestId(req.headers ?? {}), getOpsDashboard({ tenantId: actor.tenantId }));
  }

  @Post("approvals/:approvalId/decision")
  @RequirePermissions("ops:risk:read")
  approvalDecision(@Req() req: { headers?: Record<string, unknown> }, @Param("approvalId") approvalId: string) {
    return ok(resolveRequestId(req.headers ?? {}), { approvalId, status: "recorded" });
  }
}
