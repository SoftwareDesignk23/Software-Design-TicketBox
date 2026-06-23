import { z } from 'zod'

const concertPayloadSchema = z.object({
	title: z.string().trim().min(1),
	description: z.string().trim().min(1).optional(),
	venueId: z.string().trim().min(1),
	status: z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED']).optional(),
	heroImageUrl: z.string().trim().min(1).optional(),
	bannerUrl: z.string().trim().min(1).optional(),
	seatMapUrl: z.string().trim().min(1).optional(),
})

export const createConcertSchema = concertPayloadSchema

export type CreateConcertDto = z.infer<typeof createConcertSchema>

export const updateConcertSchema = concertPayloadSchema
	.partial()
	.refine((data) => Object.keys(data).length > 0, {
		message: 'At least one field is required.',
	})

export type UpdateConcertDto = z.infer<typeof updateConcertSchema>

export const createTicketTypeSchema = z.object({
	name: z.string().trim().min(1),
	price: z.number().min(0),
	totalQuantity: z.number().min(1).optional(),
	colorCode: z.string().trim().optional(),
	maxPerOrder: z.number().min(1).default(1),
	isSeated: z.boolean().optional(),
	rows: z.number().min(1).optional(),
	seatsPerRow: z.number().min(1).optional(),
})

export const updateTicketTypeSchema = createTicketTypeSchema.partial()

export const createShowSchema = z.object({
	startsAt: z.coerce.date(),
	endsAt: z.coerce.date(),
	salesOpensAt: z.coerce.date(),
})

export const updateShowSchema = createShowSchema.partial()

export const assignArtistSchema = z.object({
	artistId: z.string().trim().min(1),
	role: z.string().trim().min(1),
})

export const updateConcertGatesSchema = z.object({
	gates: z.array(z.object({
		name: z.string().trim().min(1),
		capacity: z.number().int().min(1),
		type: z.enum(['REGULAR', 'GUEST']),
	})),
})
