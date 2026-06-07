import { Inject, Injectable } from '@nestjs/common'
import type { ConfigType } from '@nestjs/config'
import { bookingConfig } from './booking.config.js'
import { redisKeys } from '../redis/redis.keys.js'
import { RedisService } from '../redis/redis.service.js'
import type { QueueStatus } from './booking.types.js'

@Injectable()
export class BookingQueueService {
	constructor(
		private readonly redis: RedisService,
		@Inject(bookingConfig.KEY) private readonly config: ConfigType<typeof bookingConfig>,
	) {}

	private get client() {
		return this.redis.getClient()
	}

	async joinQueue(eventId: string, ticketTypeId: string, userId: string) {
		const queueKey = redisKeys.queue(eventId, ticketTypeId)
		const entryKey = redisKeys.queueEntry(eventId, ticketTypeId, userId)
		const now = Date.now()

		await this.client.zadd(queueKey, 'NX', now, userId)
		const rank = await this.client.zrank(queueKey, userId)
		await this.client.hset(entryKey, {
			status: 'WAITING',
			position: rank !== null ? rank + 1 : 1,
			updatedAt: now.toString(),
		})
		return {
			status: 'WAITING' as QueueStatus,
			position: rank !== null ? rank + 1 : 1,
		}
	}

	async getStatus(eventId: string, ticketTypeId: string, userId: string) {
		const entryKey = redisKeys.queueEntry(eventId, ticketTypeId, userId)
		const entry = await this.client.hgetall(entryKey)
		if (!entry || Object.keys(entry).length === 0) {
			return { status: 'WAITING' as QueueStatus, position: null }
		}
		return {
			status: (entry.status as QueueStatus) ?? 'WAITING',
			position: entry.position ? Number(entry.position) : null,
			admissionExpiresAt: entry.admissionExpiresAt ? Number(entry.admissionExpiresAt) : null,
		}
	}

	async issueAdmissionLease(eventId: string, ticketTypeId: string) {
		const queueKey = redisKeys.queue(eventId, ticketTypeId)
		const activeKey = redisKeys.admissionActive(eventId, ticketTypeId)
		const now = Date.now()

		await this.client.zremrangebyscore(activeKey, 0, now)
		const activeCount = await this.client.zcard(activeKey)
		if (activeCount >= this.config.queueConcurrencyLimit) {
			return null
		}

		const nextUser = await this.client.zpopmin(queueKey, 1)
		if (!nextUser || nextUser.length === 0) {
			return null
		}

		const userId = nextUser[0]
		const admissionKey = redisKeys.admission(eventId, ticketTypeId, userId)
		const entryKey = redisKeys.queueEntry(eventId, ticketTypeId, userId)
		const expiresAt = now + this.config.admissionLeaseTtlSeconds * 1000

		await this.client.set(admissionKey, 'active', 'PX', this.config.admissionLeaseTtlSeconds * 1000)
		await this.client.zadd(activeKey, expiresAt, userId)
		await this.client.hset(entryKey, {
			status: 'ADMITTED',
			position: 0,
			admissionExpiresAt: expiresAt.toString(),
			updatedAt: now.toString(),
		})

		return { userId, expiresAt }
	}

	async validateAdmissionLease(eventId: string, ticketTypeId: string, userId: string) {
		const admissionKey = redisKeys.admission(eventId, ticketTypeId, userId)
		const active = await this.client.get(admissionKey)
		return Boolean(active)
	}

	async revokeAdmissionLease(eventId: string, ticketTypeId: string, userId: string) {
		const admissionKey = redisKeys.admission(eventId, ticketTypeId, userId)
		const activeKey = redisKeys.admissionActive(eventId, ticketTypeId)
		await this.client.del(admissionKey)
		await this.client.zrem(activeKey, userId)
	}

	async expireAdmissionLeases(eventId: string, ticketTypeId: string) {
		const activeKey = redisKeys.admissionActive(eventId, ticketTypeId)
		const now = Date.now()
		const expiredUsers = await this.client.zrangebyscore(activeKey, 0, now)
		if (expiredUsers.length === 0) {
			return
		}

		const pipeline = this.client.pipeline()
		for (const userId of expiredUsers) {
			const admissionKey = redisKeys.admission(eventId, ticketTypeId, userId)
			const entryKey = redisKeys.queueEntry(eventId, ticketTypeId, userId)
			pipeline.del(admissionKey)
			pipeline.hset(entryKey, {
				status: 'EXPIRED',
				updatedAt: now.toString(),
			})
		}
		pipeline.zremrangebyscore(activeKey, 0, now)
		await pipeline.exec()
	}

	async markSoldOut(eventId: string, ticketTypeId: string) {
		const queueKey = redisKeys.queue(eventId, ticketTypeId)
		const members = await this.client.zrange(queueKey, 0, -1)
		if (members.length === 0) {
			return
		}

		const pipeline = this.client.pipeline()
		for (const userId of members) {
			const entryKey = redisKeys.queueEntry(eventId, ticketTypeId, userId)
			pipeline.hset(entryKey, {
				status: 'SOLD_OUT',
				updatedAt: Date.now().toString(),
			})
		}
		pipeline.del(queueKey)
		await pipeline.exec()
	}
}
