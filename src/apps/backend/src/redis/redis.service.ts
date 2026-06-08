import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import Redis from 'ioredis'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class RedisService extends Redis.default implements OnModuleInit, OnModuleDestroy {
	constructor(configService: ConfigService) {
		super(configService.get<string>('REDIS_URL') || 'redis://localhost:6379')
	}

	onModuleInit() {
		this.on('connect', () => console.log('Redis connected'))
		this.on('error', (err) => console.error('Redis error', err))
	}

	onModuleDestroy() {
		this.disconnect()
	}
}
