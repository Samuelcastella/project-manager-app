import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";

type Job = {
  id: string;
  tenantId: string;
  title: string;
  scope: string;
  status: "draft" | "published" | "awarded" | "cancelled";
  budgetMin?: number;
  budgetMax?: number;
};

const jobs: Job[] = [];

@Controller("v1/jobs")
export class JobsController {
  @Get()
  list(@Query("status") status?: Job["status"]): Job[] {
    return status ? jobs.filter((job) => job.status === status) : jobs;
  }

  @Get(":jobId")
  detail(@Param("jobId") jobId: string): Job | undefined {
    return jobs.find((job) => job.id === jobId);
  }

  @Post()
  create(
    @Body()
    body: Pick<Job, "title" | "scope" | "budgetMin" | "budgetMax"> & {
      tenantId?: string;
    }
  ): Job {
    const job: Job = {
      id: `job_${Date.now()}`,
      tenantId: body.tenantId ?? "tnt_demo",
      title: body.title,
      scope: body.scope,
      status: "published",
      budgetMin: body.budgetMin,
      budgetMax: body.budgetMax
    };

    jobs.push(job);
    return job;
  }
}
