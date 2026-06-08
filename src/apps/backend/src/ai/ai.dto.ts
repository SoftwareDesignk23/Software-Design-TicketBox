import { z } from 'zod'

export const aiBioRequestSchema = z.object({
	concertId: z.string().uuid(),
	fileUrl: z.string().url(),
})

export type AiBioRequestDto = z.infer<typeof aiBioRequestSchema>
