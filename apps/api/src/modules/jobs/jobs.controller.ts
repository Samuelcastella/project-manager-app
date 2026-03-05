import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Query, Req } from "@nestjs/common";
import { z } from "zod";
import { ok } from "../../common/api-response.js";
import { appendAudit } from "../../common/audit-log.store.js";
import { resolveRequestId } from "../../common/request-id.js";

type Job = {
  id: string;
  tenantId: string;
  title: string;
  scope: string;
  status: "draft" | "published" | "awarded" | "cancelled";
  budgetMin?: number;
  budgetMax?: number;
};

const createJobSchema = z.object({
  tenantId: z.string().min(1).default("tnt_demo"),
  actorUserId: z.string().min(1).default("usr_demo_001"),
  title: z.string().min(5).max(140),
  scope: z.string().min(10).max(5000),
  budgetMin: z.number().nonnegative().optional(),
  budgetMax: z.number().nonnegative().optional()
});

const listJobsQuerySchema = z.object({
  status: z.enum(["draft", "published", "awarded", "cancelled"]).optional()
});

const jobs: Job[] = [];

@Controller("v1/jobs")
export class JobsController {
  @Get()
  list(@Req() req: any, @Query() query: Record<string, unknown>) {
    const parsed = listJobsQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const data = parsed.data.status ? jobs.filter((job) => job.status === parsed.data.status) : jobs;
    return ok(resolveRequestId(req.headers ?? {}), data);
  }

  @Get(":jobId")
  detail(@Req() req: any, @Param("jobId") jobId: string) {
    const job = jobs.find((entry) => entry.id === jobId);
    if (!job) {
      throw new NotFoundException(`Job '${jobId}' not found`);
    }

    return ok(resolveRequestId(req.headers ?? {}), job);
  }

  @Post()
  create(@Req() req: any, @Body() body: Record<string, unknown>) {
    const parsed = createJobSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const input = parsed.data;
    const requestId = resolveRequestId(req.headers ?? {});
    const job: Job = {
      id: `job_${Date.now()}`,
      tenantId: input.tenantId,
      title: input.title,
      scope: input.scope,
      status: "published",
      budgetMin: input.budgetMin,
      budgetMax: input.budgetMax
    };

    jobs.push(job);
    appendAudit({
      id: `aud_${Date.now()}`,
      actorUserId: input.actorUserId,
      action: "job.create",
      entityType: "Job",
      entityId: job.id,
      requestId,
      timestamp: new Date().toISOString()
    });

    return ok(requestId, job);
  }
}
