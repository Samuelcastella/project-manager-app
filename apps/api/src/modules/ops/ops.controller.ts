import { Controller, Get, Param, Post } from "@nestjs/common";

@Controller("v1/ops")
export class OpsController {
  @Get("audit")
  audit(): Array<{ id: string; action: string; entityType: string; timestamp: string }> {
    return [
      {
        id: "aud_demo",
        action: "milestone.approve",
        entityType: "Milestone",
        timestamp: new Date().toISOString()
      }
    ];
  }

  @Get("risk-scores")
  riskScores(): Array<{ subjectType: string; subjectId: string; score: number }> {
    return [{ subjectType: "project", subjectId: "prj_demo", score: 0.22 }];
  }

  @Post("approvals/:approvalId/decision")
  approvalDecision(@Param("approvalId") approvalId: string): { approvalId: string; status: string } {
    return { approvalId, status: "recorded" };
  }
}
