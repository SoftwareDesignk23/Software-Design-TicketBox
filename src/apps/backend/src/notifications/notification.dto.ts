import { z } from 'zod'
import { NotificationChannel } from '@prisma/client'

export const sendNotificationSchema = z.object({
	userId: z.string().trim().min(1),
	concertId: z.string().trim().min(1).optional(),
	type: z.string().trim().min(1),
	channel: z.nativeEnum(NotificationChannel),
	payload: z.any().optional(),
})

export type SendNotificationDto = z.infer<typeof sendNotificationSchema>

