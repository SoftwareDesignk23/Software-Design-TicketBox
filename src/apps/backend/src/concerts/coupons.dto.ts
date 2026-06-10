import { z } from 'zod';

export const createCouponSchema = z.object({
  code: z.string().trim().min(3).max(20),
  discountPercentage: z.number().int().min(1).max(100),
  maxUsage: z.number().int().min(1),
});

export type CreateCouponDto = z.infer<typeof createCouponSchema>;

export const updateCouponSchema = z.object({
  isActive: z.boolean(),
});

export type UpdateCouponDto = z.infer<typeof updateCouponSchema>;
