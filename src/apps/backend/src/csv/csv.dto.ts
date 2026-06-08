import { z } from 'zod'

export const csvImportSchema = z.object({
	concertId: z.string().uuid(),
	fileUrl: z.string().url(),
})

export type CsvImportDto = z.infer<typeof csvImportSchema>
