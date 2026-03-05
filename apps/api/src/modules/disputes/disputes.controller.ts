import { Body, Controller, Get, Param, Post } from "@nestjs/common";

@Controller("v1/disputes")
export class DisputesController {
  @Get()
  list(): Array<{ id: string; status: string; severity: string }> {
    return [{ id: "dsp_demo", status: "open", severity: "medium" }];
  }

  @Post()
  create(@Body() body: { projectId: string; reason: string }): { id: string; projectId: string; status: string } {
    return {
      id: `dsp_${Date.now()}`,
      projectId: body.projectId,
      status: "open"
    };
  }

  @Post(":disputeId/assign")
  assign(
    @Param("disputeId") disputeId: string,
    @Body() body: { assigneeUserId: string }
  ): { disputeId: string; assigneeUserId: string; status: string } {
    return { disputeId, assigneeUserId: body.assigneeUserId, status: "assigned" };
  }

  @Post(":disputeId/resolve")
  resolve(
    @Param("disputeId") disputeId: string,
    @Body() body: { resolution: string }
  ): { disputeId: string; status: string; resolution: string } {
    return { disputeId, status: "resolved", resolution: body.resolution };
  }
}
