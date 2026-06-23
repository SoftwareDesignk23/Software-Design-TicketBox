import { z } from 'zod'
import { Role } from '@prisma/client'

export const registerSchema = z.object({
	email: z.string().email().trim(),
	password: z.string().min(8),
	displayName: z.string().min(2).trim(),
	role: z.nativeEnum(Role).optional(),
})

export type RegisterDto = z.infer<typeof registerSchema>

export const createStaffSchema = z.object({
	password: z.string().min(8),
	displayName: z.string().min(2).trim(),
	assignedGateId: z.string().trim(),
})
