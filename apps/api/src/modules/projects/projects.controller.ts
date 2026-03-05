import { Controller, Get, Param, Req } from "@nestjs/common";
import { ok } from "../../common/api-response.js";
import { findProjectOrThrow } from "../../common/domain-service.js";
import { domainStore } from "../../common/domain-store.js";
import { RequirePermissions } from "../../common/permissions.decorator.js";
import { resolveRequestContext } from "../../common/request-context.js";
import { resolveRequestId } from "../../common/request-id.js";

@Controller("v1/projects")
export class ProjectsController {
  @Get(":projectId")
  @RequirePermissions("jobs:read")
  detail(@Req() req: { headers?: Record<string, unknown> }, @Param("projectId") projectId: string) {
    const actor = resolveRequestContext(req);
    const project = findProjectOrThrow({ tenantId: actor.tenantId, projectId });
    return ok(resolveRequestId(req.headers ?? {}), project);
  }

  @Get(":projectId/payments")
  @RequirePermissions("jobs:read")
  payments(@Req() req: { headers?: Record<string, unknown> }, @Param("projectId") projectId: string) {
    const actor = resolveRequestContext(req);
    const transactions = domainStore.paymentTxns.filter(
      (entry) => entry.projectId === projectId && entry.tenantId === actor.tenantId
    );

    return ok(resolveRequestId(req.headers ?? {}), transactions);
  }
}
