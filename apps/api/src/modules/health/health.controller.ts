import { Controller, Get, Req } from "@nestjs/common";
import { ok } from "../../common/api-response.js";
import { resolveRequestId } from "../../common/request-id.js";

@Controller("v1/health")
export class HealthController {
  @Get()
  health(@Req() req: any) {
    return ok(resolveRequestId(req.headers ?? {}), {
      status: "ok",
      service: "semse-api",
      timestamp: new Date().toISOString()
    });
  }
}
