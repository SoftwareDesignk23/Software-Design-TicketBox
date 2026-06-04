import { z } from 'zod'

const concertPayloadSchema = z.object({
	title: z.string().trim().min(1),
	description: z.string().trim().min(1).optional(),
	venueName: z.string().trim().min(1),
	venueAddress: z.string().trim().min(1).optional(),
	startsAt: z.coerce.date(),
	endsAt: z.coerce.date().optional(),
	salesOpensAt: z.coerce.date().optional(),
	status: z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED']).optional(),
	heroImageUrl: z.string().trim().min(1).optional(),
})

export const createConcertSchema = concertPayloadSchema
	.refine((data) => !data.endsAt || data.endsAt > data.startsAt, {
		message: 'endsAt must be after startsAt.',
		path: ['endsAt'],
	})

export type CreateConcertDto = z.infer<typeof createConcertSchema>

export const updateConcertSchema = concertPayloadSchema
	.partial()
	.refine((data) => Object.keys(data).length > 0, {
		message: 'At least one field is required.',
	})
	.refine((data) => !data.endsAt || !data.startsAt || data.endsAt > data.startsAt, {
		message: 'endsAt must be after startsAt.',
		path: ['endsAt'],
	})

export type UpdateConcertDto = z.infer<typeof updateConcertSchema>
