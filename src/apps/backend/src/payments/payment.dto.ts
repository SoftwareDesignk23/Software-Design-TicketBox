import { z } from 'zod'
import { PaymentProvider } from '@prisma/client'

export const createPaymentSchema = z.object({
	bookingId: z.string().trim().min(1),
	provider: z.nativeEnum(PaymentProvider),
	returnUrl: z.string().url().optional(),
	attendeeInfo: z.object({
		name: z.string().trim().min(1),
		email: z.string().email(),
		phone: z.string().trim().min(1),
		idCard: z.string().trim().min(1),
	}).optional(),
})

export type CreatePaymentDto = z.infer<typeof createPaymentSchema>

export const paymentWebhookSchema = z.object({
	providerRef: z.string().trim().min(1),
	status: z.enum(['SUCCESS', 'FAILED']),
	amount: z.number().positive(),
})

export type PaymentWebhookDto = z.infer<typeof paymentWebhookSchema>
