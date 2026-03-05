import { Controller, Get } from "@nestjs/common";

@Controller("v1/health")
export class HealthController {
  @Get()
  health(): { status: string; service: string; timestamp: string } {
    return {
      status: "ok",
      service: "semse-api",
      timestamp: new Date().toISOString()
    };
  }
}
