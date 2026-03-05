import { z } from "zod";

export const createJobSchema = z.object({
  tenantId: z.string().min(1),
  title: z.string().min(5).max(140),
  scope: z.string().min(10).max(5000),
  budgetMin: z.number().nonnegative().optional(),
  budgetMax: z.number().nonnegative().optional()
});

export const bidSchema = z.object({
  jobId: z.string().min(1),
  proOrgId: z.string().min(1),
  amount: z.number().positive(),
  etaDays: z.number().int().positive()
});
