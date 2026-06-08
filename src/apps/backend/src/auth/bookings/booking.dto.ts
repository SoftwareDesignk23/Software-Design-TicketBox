import { z } from 'zod'

const bookingItemSchema = z.object({
	ticketTypeId: z.string().trim().min(1),
	showSeatId: z.string().trim().min(1).optional(),
	quantity: z.coerce.number().int().positive(),
})

export const createBookingSchema = z.object({
	showId: z.string().trim().min(1), // Added showId
	idempotencyKey: z.string().trim().min(1).optional(),
	items: z.array(bookingItemSchema).min(1),
})

export type CreateBookingDto = z.infer<typeof createBookingSchema>
