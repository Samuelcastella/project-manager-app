import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Query, Req } from "@nestjs/common";
import { z } from "zod";
import { ok } from "../../common/api-response.js";
import { appendAudit } from "../../common/audit-log.store.js";
import { domainStore, type JobRecord } from "../../common/domain-store.js";
import { RequirePermissions } from "../../common/permissions.decorator.js";
import { resolveRequestContext } from "../../common/request-context.js";
import { resolveRequestId } from "../../common/request-id.js";

const createJobSchema = z.object({
  title: z.string().min(5).max(140),
  scope: z.string().min(10).max(5000),
  budgetMin: z.number().nonnegative().optional(),
  budgetMax: z.number().nonnegative().optional()
});

const listJobsQuerySchema = z.object({
  status: z.enum(["draft", "published", "awarded", "cancelled"]).optional()
});

@Controller("v1/jobs")
export class JobsController {
  @Get()
  @RequirePermissions("jobs:read")
  list(@Req() req: { headers?: Record<string, unknown> }, @Query() query: Record<string, unknown>) {
    const parsed = listJobsQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const actor = resolveRequestContext(req);
    const filtered = domainStore.jobs.filter((job) => job.tenantId === actor.tenantId);
    const data = parsed.data.status ? filtered.filter((job) => job.status === parsed.data.status) : filtered;
    return ok(resolveRequestId(req.headers ?? {}), data);
  }

  @Get(":jobId")
  @RequirePermissions("jobs:read")
  detail(@Req() req: { headers?: Record<string, unknown> }, @Param("jobId") jobId: string) {
    const actor = resolveRequestContext(req);
    const job = domainStore.jobs.find((entry) => entry.id === jobId && entry.tenantId === actor.tenantId);
    if (!job) {
      throw new NotFoundException(`Job '${jobId}' not found`);
    }

    return ok(resolveRequestId(req.headers ?? {}), job);
  }

  @Post()
  @RequirePermissions("jobs:create")
  create(@Req() req: { headers?: Record<string, unknown> }, @Body() body: Record<string, unknown>) {
    const parsed = createJobSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const actor = resolveRequestContext(req);
    const requestId = resolveRequestId(req.headers ?? {});
    const job: JobRecord = {
      id: `job_${Date.now()}`,
      tenantId: actor.tenantId,
      title: parsed.data.title,
      scope: parsed.data.scope,
      status: "published",
      budgetMin: parsed.data.budgetMin,
      budgetMax: parsed.data.budgetMax
    };

    domainStore.jobs.push(job);
    appendAudit({
      id: `aud_${Date.now()}`,
      actorUserId: actor.userId,
      action: "job.create",
      entityType: "Job",
      entityId: job.id,
      requestId,
      timestamp: new Date().toISOString()
    });

    return ok(requestId, job);
  }
}
