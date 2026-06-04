import { Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { RedisService } from '@/redis/redis.service.js'
import { redisKeys } from '@/redis/redis.keys.js'
import { releaseLockScript } from '@/redis/redis.scripts.js'

@Injectable()
export class DistributedLockService {
	constructor(private readonly redis: RedisService) {}

	private get client() {
		return this.redis.getClient()
	}

	async acquire(resource: string, ttlMs: number, retries: number, backoffMs: number) {
		const key = redisKeys.lock(resource)
		const owner = randomUUID()

		for (let attempt = 0; attempt <= retries; attempt += 1) {
			const acquired = await this.client.set(key, owner, 'PX', ttlMs, 'NX')
			if (acquired) {
				return { key, owner }
			}
			if (attempt < retries) {
				await new Promise((resolve) => setTimeout(resolve, backoffMs))
			}
		}

		return null
	}

	async release(lock: { key: string; owner: string }) {
		await this.client.eval(releaseLockScript, 1, lock.key, lock.owner)
	}
}
