import { Body, Controller, Get, Param, Post } from "@nestjs/common";

@Controller("v1/agents")
export class AgentsController {
  @Get("catalog")
  catalog(): Array<{ key: string; purpose: string }> {
    return [
      { key: "pricing", purpose: "suggested pricing" },
      { key: "job-planner", purpose: "execution plan" },
      { key: "evidence-coach", purpose: "evidence guidance" },
      { key: "risk", purpose: "risk scoring" },
      { key: "dispute", purpose: "dispute recommendation" }
    ];
  }

  @Get("runs")
  listRuns(): Array<{ id: string; agent: string; status: string }> {
    return [{ id: "run_demo", agent: "risk", status: "completed" }];
  }

  @Get("runs/:runId")
  detail(@Param("runId") runId: string): { id: string; status: string } {
    return { id: runId, status: "completed" };
  }

  @Post("runs")
  createRun(
    @Body() body: { agentType: string; input: Record<string, unknown> }
  ): { id: string; agentType: string; status: string } {
    return {
      id: `run_${Date.now()}`,
      agentType: body.agentType,
      status: "queued"
    };
  }

  @Post("runs/:runId/retry")
  retry(@Param("runId") runId: string): { id: string; status: string } {
    return { id: runId, status: "requeued" };
  }
}
