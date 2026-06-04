import { registerAs } from '@nestjs/config'
import { z } from 'zod'

export const bookingEnvSchema = z.object({
	BOOKING_RESERVATION_TTL_SECONDS: z.coerce.number().int().positive().default(300),
	BOOKING_QUEUE_CONCURRENCY_LIMIT: z.coerce.number().int().positive().default(250),
	BOOKING_ADMISSION_LEASE_TTL_SECONDS: z.coerce.number().int().positive().default(60),
	BOOKING_ADMISSION_MAX_ATTEMPTS: z.coerce.number().int().positive().default(3),
	BOOKING_RETRY_BUDGET: z.coerce.number().int().positive().default(3),
	BOOKING_USER_TICKET_LIMIT_PER_EVENT: z.coerce.number().int().positive().default(4),
	BOOKING_USER_TICKET_LIMIT_PER_TICKET_TYPE: z.coerce.number().int().positive().default(4),
	BOOKING_QUEUE_ENABLED: z.union([z.literal('true'), z.literal('false')]).default('false'),
})

export type BookingConfig = {
	reservationTtlSeconds: number
	queueConcurrencyLimit: number
	admissionLeaseTtlSeconds: number
	admissionMaxAttempts: number
	retryBudget: number
	userTicketLimitPerEvent: number
	userTicketLimitPerTicketType: number
	queueEnabled: boolean
}

export const bookingConfig = registerAs('booking', (): BookingConfig => {
	const parsed = bookingEnvSchema.parse(process.env)
	return {
		reservationTtlSeconds: parsed.BOOKING_RESERVATION_TTL_SECONDS,
		queueConcurrencyLimit: parsed.BOOKING_QUEUE_CONCURRENCY_LIMIT,
		admissionLeaseTtlSeconds: parsed.BOOKING_ADMISSION_LEASE_TTL_SECONDS,
		admissionMaxAttempts: parsed.BOOKING_ADMISSION_MAX_ATTEMPTS,
		retryBudget: parsed.BOOKING_RETRY_BUDGET,
		userTicketLimitPerEvent: parsed.BOOKING_USER_TICKET_LIMIT_PER_EVENT,
		userTicketLimitPerTicketType: parsed.BOOKING_USER_TICKET_LIMIT_PER_TICKET_TYPE,
		queueEnabled: parsed.BOOKING_QUEUE_ENABLED === 'true',
	}
})
