import { registerAs } from '@nestjs/config'
import { z } from 'zod'

export const redisEnvSchema = z.object({
	REDIS_URL: z.string().default('redis://localhost:6379'),
})

export type RedisConfig = {
	url: string
}

export const redisConfig = registerAs('redis', (): RedisConfig => {
	const parsed = redisEnvSchema.parse(process.env)
	return {
		url: parsed.REDIS_URL,
	}
})
