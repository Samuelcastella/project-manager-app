import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import { ok } from "../../common/api-response.js";
import { appendAudit } from "../../common/audit-log.store.js";
import { resolveRequestId } from "../../common/request-id.js";

@Controller()
export class EvidenceController {
  @Post("v1/evidence/presign")
  presign(@Req() req: any, @Body() body: { filename: string; contentType: string }) {
    const requestId = resolveRequestId(req.headers ?? {});
    const key = `evidence/${Date.now()}-${body.filename}`;
    return ok(requestId, {
      uploadUrl: `https://minio.local/upload/${key}`,
      key,
      contentType: body.contentType
    });
  }

  @Post("v1/evidence")
  register(@Req() req: any, @Body() body: { projectId: string; milestoneId?: string; key: string; kind: string; actorUserId?: string }) {
    const requestId = resolveRequestId(req.headers ?? {});
    const id = `ev_${Date.now()}`;
    appendAudit({
      id: `aud_${Date.now()}`,
      actorUserId: body.actorUserId ?? "usr_demo_001",
      action: "evidence.register",
      entityType: "Evidence",
      entityId: id,
      requestId,
      timestamp: new Date().toISOString()
    });
    return ok(requestId, {
      id,
      projectId: body.projectId,
      milestoneId: body.milestoneId,
      key: body.key,
      kind: body.kind
    });
  }

  @Get("v1/projects/:projectId/evidence")
  list(@Req() req: any, @Param("projectId") projectId: string) {
    return ok(resolveRequestId(req.headers ?? {}), [{ id: "ev_demo", projectId, kind: "photo" }]);
  }

  @Get("v1/evidence/:evidenceId")
  detail(@Req() req: any, @Param("evidenceId") evidenceId: string) {
    return ok(resolveRequestId(req.headers ?? {}), { id: evidenceId, status: "available" });
  }
}
