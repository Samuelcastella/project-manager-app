import { Body, Controller, Get, Param, Post } from "@nestjs/common";

@Controller()
export class EvidenceController {
  @Post("v1/evidence/presign")
  presign(@Body() body: { filename: string; contentType: string }): { uploadUrl: string; key: string } {
    const key = `evidence/${Date.now()}-${body.filename}`;
    return {
      uploadUrl: `https://minio.local/upload/${key}`,
      key
    };
  }

  @Post("v1/evidence")
  register(
    @Body() body: { projectId: string; milestoneId?: string; key: string; kind: string }
  ): { id: string; projectId: string; key: string; kind: string } {
    return {
      id: `ev_${Date.now()}`,
      projectId: body.projectId,
      key: body.key,
      kind: body.kind
    };
  }

  @Get("v1/projects/:projectId/evidence")
  list(@Param("projectId") projectId: string): Array<{ id: string; projectId: string; kind: string }> {
    return [{ id: "ev_demo", projectId, kind: "photo" }];
  }

  @Get("v1/evidence/:evidenceId")
  detail(@Param("evidenceId") evidenceId: string): { id: string; status: string } {
    return { id: evidenceId, status: "available" };
  }
}
