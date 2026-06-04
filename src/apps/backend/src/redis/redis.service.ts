import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common'
import { ConfigType } from '@nestjs/config'
import IORedis from 'ioredis'
import { redisConfig } from './redis.config.js'

@Injectable()
export class RedisService implements OnModuleDestroy {
	private readonly client: IORedis

	constructor(@Inject(redisConfig.KEY) config: ConfigType<typeof redisConfig>) {
		this.client = new IORedis(config.url)
	}

	getClient() {
		return this.client
	}

	async onModuleDestroy() {
		await this.client.quit()
	}
}
