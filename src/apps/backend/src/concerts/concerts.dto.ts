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
