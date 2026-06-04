import { registerAs } from '@nestjs/config'
import { z } from 'zod'

export const authEnvSchema = z.object({
	JWT_ISSUER: z.string().default('ticketbox'),
	JWT_AUDIENCE: z.string().default('ticketbox.clients'),
	JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
	JWT_REFRESH_TTL_SECONDS: z.coerce.number().int().positive().default(1209600),
	JWT_SIGNING_SECRET: z.string().min(16).default('dev-ticketbox-secret-change-me'),
})

export type AuthConfig = {
	issuer: string
	audience: string
	accessTokenTtlSeconds: number
	refreshTokenTtlSeconds: number
	signingSecret: string
}

export const authConfig = registerAs('auth', (): AuthConfig => {
	const parsed = authEnvSchema.parse(process.env)
	return {
		issuer: parsed.JWT_ISSUER,
		audience: parsed.JWT_AUDIENCE,
		accessTokenTtlSeconds: parsed.JWT_ACCESS_TTL_SECONDS,
		refreshTokenTtlSeconds: parsed.JWT_REFRESH_TTL_SECONDS,
		signingSecret: parsed.JWT_SIGNING_SECRET,
	}
})
