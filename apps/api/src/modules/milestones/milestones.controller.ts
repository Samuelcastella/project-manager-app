import { Body, Controller, Param, Patch, Post } from "@nestjs/common";

@Controller()
export class MilestonesController {
  @Post("v1/projects/:projectId/milestones")
  create(
    @Param("projectId") projectId: string,
    @Body() body: { title: string; amount: number; sequence: number }
  ): { id: string; projectId: string; title: string; status: string } {
    return {
      id: `ms_${Date.now()}`,
      projectId,
      title: body.title,
      status: "draft"
    };
  }

  @Post("v1/milestones/:milestoneId/submit")
  submit(@Param("milestoneId") milestoneId: string): { milestoneId: string; status: string } {
    return { milestoneId, status: "submitted" };
  }

  @Post("v1/milestones/:milestoneId/approve")
  approve(@Param("milestoneId") milestoneId: string): { milestoneId: string; status: string } {
    return { milestoneId, status: "approved" };
  }

  @Post("v1/milestones/:milestoneId/reject")
  reject(
    @Param("milestoneId") milestoneId: string,
    @Body() body: { reason: string }
  ): { milestoneId: string; status: string; reason: string } {
    return { milestoneId, status: "rejected", reason: body.reason };
  }

  @Patch("v1/projects/:projectId/status")
  updateProjectStatus(
    @Param("projectId") projectId: string,
    @Body() body: { status: string }
  ): { projectId: string; status: string } {
    return { projectId, status: body.status };
  }
}
