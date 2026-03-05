import { Controller, Get, Param, Post, Req } from "@nestjs/common";
import { ok } from "../../common/api-response.js";
import { listAudit } from "../../common/audit-log.store.js";
import { resolveRequestId } from "../../common/request-id.js";

@Controller("v1/ops")
export class OpsController {
  @Get("audit")
  audit(@Req() req: any) {
    return ok(resolveRequestId(req.headers ?? {}), listAudit());
  }

  @Get("risk-scores")
  riskScores(@Req() req: any) {
    const data = [{ subjectType: "project", subjectId: "prj_demo", score: 0.22 }];
    return ok(resolveRequestId(req.headers ?? {}), data);
  }

  @Post("approvals/:approvalId/decision")
  approvalDecision(@Req() req: any, @Param("approvalId") approvalId: string) {
    return ok(resolveRequestId(req.headers ?? {}), { approvalId, status: "recorded" });
  }
}
