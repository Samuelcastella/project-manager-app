import { BadRequestException, Body, Controller, Param, Post, Req } from "@nestjs/common";
import { z } from "zod";
import { ok } from "../../common/api-response.js";
import { appendAudit } from "../../common/audit-log.store.js";
import { createEscrowDeposit, releaseMilestonePayment } from "../../common/domain-service.js";
import { RequirePermissions } from "../../common/permissions.decorator.js";
import { resolveRequestContext } from "../../common/request-context.js";
import { resolveRequestId } from "../../common/request-id.js";

const depositSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().min(3).max(3).optional()
});

const releaseSchema = z.object({
  projectId: z.string().min(1),
  amount: z.number().positive()
});

@Controller()
export class PaymentsController {
  @Post("v1/projects/:projectId/escrow/deposit")
  @RequirePermissions("milestones:approve")
  deposit(@Req() req: { headers?: Record<string, unknown> }, @Param("projectId") projectId: string, @Body() body: Record<string, unknown>) {
    const parsed = depositSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const actor = resolveRequestContext(req);
    const requestId = resolveRequestId(req.headers ?? {});
    const result = createEscrowDeposit({
      tenantId: actor.tenantId,
      projectId,
      amount: parsed.data.amount,
      currency: parsed.data.currency
    });

    appendAudit({
      id: `aud_${Date.now()}`,
      actorUserId: actor.userId,
      action: "escrow.deposit",
      entityType: "Escrow",
      entityId: result.escrow.id,
      requestId,
      timestamp: new Date().toISOString()
    });

    return ok(requestId, result);
  }

  @Post("v1/milestones/:milestoneId/escrow/release")
  @RequirePermissions("milestones:approve")
  release(@Req() req: { headers?: Record<string, unknown> }, @Param("milestoneId") milestoneId: string, @Body() body: Record<string, unknown>) {
    const parsed = releaseSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const actor = resolveRequestContext(req);
    const requestId = resolveRequestId(req.headers ?? {});
    const txn = releaseMilestonePayment({
      tenantId: actor.tenantId,
      milestoneId,
      projectId: parsed.data.projectId,
      amount: parsed.data.amount
    });

    appendAudit({
      id: `aud_${Date.now()}`,
      actorUserId: actor.userId,
      action: "escrow.release",
      entityType: "PaymentTxn",
      entityId: txn.id,
      requestId,
      timestamp: new Date().toISOString()
    });

    return ok(requestId, txn);
  }

  @Post("v1/payments/webhook")
  webhook(@Req() req: { headers?: Record<string, unknown> }, @Body() body: { event?: string; providerRef?: string }) {
    const requestId = resolveRequestId(req.headers ?? {});
    return ok(requestId, {
      accepted: true,
      event: body.event ?? "unknown",
      providerRef: body.providerRef ?? "n/a"
    });
  }
}
