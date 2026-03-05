import { Module } from "@nestjs/common";
import { HealthController } from "./modules/health/health.controller.js";
import { AuthController } from "./modules/auth/auth.controller.js";
import { JobsController } from "./modules/jobs/jobs.controller.js";
import { BidsController } from "./modules/bids/bids.controller.js";
import { MilestonesController } from "./modules/milestones/milestones.controller.js";
import { EvidenceController } from "./modules/evidence/evidence.controller.js";
import { DisputesController } from "./modules/disputes/disputes.controller.js";
import { OpsController } from "./modules/ops/ops.controller.js";
import { AgentsController } from "./modules/agents/agents.controller.js";

@Module({
  controllers: [
    HealthController,
    AuthController,
    JobsController,
    BidsController,
    MilestonesController,
    EvidenceController,
    DisputesController,
    OpsController,
    AgentsController
  ]
})
export class AppModule {}
