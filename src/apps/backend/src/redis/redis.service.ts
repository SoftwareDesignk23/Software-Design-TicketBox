import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common'
import type { ConfigType } from '@nestjs/config'
import IORedis, { Redis } from 'ioredis'
import { redisConfig } from './redis.config.js'

@Injectable()
export class RedisService implements OnModuleDestroy {
	private readonly client: Redis

	constructor(@Inject(redisConfig.KEY) config: ConfigType<typeof redisConfig>) {
		this.client = new Redis(config.url)
	}

	getClient() {
		return this.client
	}

	async onModuleDestroy() {
		await this.client.quit()
	}
}
