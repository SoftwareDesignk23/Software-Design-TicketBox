import { z } from 'zod'

export const checkinSyncSchema = z.object({
	logs: z.array(
		z.object({
			scannedAt: z.string().datetime(),
			ticketId: z.string().uuid(),
			deviceId: z.string(),
			scanResult: z.enum(['VALID', 'INVALID', 'ALREADY_SCANNED']),
		}),
	),
})

export type CheckinSyncDto = z.infer<typeof checkinSyncSchema>
