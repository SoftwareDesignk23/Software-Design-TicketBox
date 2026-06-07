import { Inject, Injectable } from '@nestjs/common'
import type { ConfigType } from '@nestjs/config'
import { randomUUID } from 'node:crypto'
import { PrismaService } from '../prisma/prisma.service.js'
import { RedisService } from '../redis/redis.service.js'
import { redisKeys } from '../redis/redis.keys.js'
import {
	completeInventoryScript,
	releaseInventoryScript,
	reserveInventoryScript,
} from '../redis/redis.scripts.js'
import { bookingConfig } from './booking.config.js'
import { BookingAvailabilityService } from './booking.availability.js'
import { BookingQueueService } from './booking.queue.js'
import { DistributedLockService } from './booking.lock.js'
import {
	bookingBadRequest,
	BookingErrorCode,
	reservationConflict,
	reservationNotFound,
	ticketLimitExceeded,
} from './booking.errors.js'
import type { AvailabilityEvent, AvailabilitySnapshot } from './booking.types.js'

@Injectable()
export class BookingService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly redis: RedisService,
		private readonly availability: BookingAvailabilityService,
		private readonly queue: BookingQueueService,
		private readonly locks: DistributedLockService,
		@Inject(bookingConfig.KEY) private readonly config: ConfigType<typeof bookingConfig>,
	) {}

	private get client() {
		return this.redis.getClient()
	}

	async createReservation(params: {
		userId: string
		ticketTypeId: string
		quantity: number
		admissionRequired: boolean
	}) {
		const ticketType = await this.prisma.ticketType.findUnique({
			where: { id: params.ticketTypeId },
			include: { event: true, inventory: true },
		})

		if (!ticketType || !ticketType.inventory) {
			bookingBadRequest(BookingErrorCode.InventoryInsufficient, 'Ticket type not found.')
		}

		if (params.admissionRequired || this.config.queueEnabled) {
			const admitted = await this.queue.validateAdmissionLease(
				ticketType.eventId,
				ticketType.id,
				params.userId,
			)
			if (!admitted) {
				bookingBadRequest(
					BookingErrorCode.QueueAdmissionRequired,
					'Admission required for this ticket type.',
				)
			}
		}

		await this.ensureRedisInventory(ticketType.eventId, ticketType.id, ticketType.inventory)

		const completedCount = await this.prisma.booking.aggregate({
			where: { userId: params.userId, eventId: ticketType.eventId },
			_sum: { quantity: true },
		})

		const completed = completedCount._sum.quantity ?? 0
		const limit = this.config.userTicketLimitPerEvent

		const availabilityKey = redisKeys.availability(ticketType.eventId, ticketType.id)
		const reservedKey = redisKeys.reserved(ticketType.eventId, ticketType.id)
		const pendingKey = redisKeys.pending('event', params.userId, ticketType.eventId)

		const result = (await this.client.eval(
			reserveInventoryScript,
			3,
			availabilityKey,
			reservedKey,
			pendingKey,
			params.quantity.toString(),
			completed.toString(),
			limit.toString(),
		)) as [number, string | number, number]

		if (result[0] === 0) {
			const reason = result[1]
			if (reason === 'LIMIT') {
				const pending = Number(result[2] ?? 0)
				const remaining = Math.max(limit - completed - pending, 0)
				ticketLimitExceeded(limit, remaining)
			}
			bookingBadRequest(BookingErrorCode.InventoryInsufficient, 'Not enough tickets available.')
		}

		const reservationId = randomUUID()
		const expiresAt = new Date(Date.now() + this.config.reservationTtlSeconds * 1000)

		try {
			const updated = await this.prisma.ticketInventory.updateMany({
				where: { id: ticketType.inventory.id, version: ticketType.inventory.version },
				data: {
					available: ticketType.inventory.available - params.quantity,
					reserved: ticketType.inventory.reserved + params.quantity,
					version: { increment: 1 },
				},
			})

			if (updated.count === 0) {
				await this.client.eval(
					releaseInventoryScript,
					3,
					availabilityKey,
					reservedKey,
					pendingKey,
					params.quantity.toString(),
				)

				await this.prisma.reservation.create({
					data: {
						id: reservationId,
						userId: params.userId,
						ticketTypeId: ticketType.id,
						quantity: params.quantity,
						status: 'RECONCILIATION_REQUIRED',
						expiresAt,
						inventoryVersion: ticketType.inventory.version,
					},
				})

				reservationConflict(
					BookingErrorCode.ReservationPersistenceFailed,
					'Reservation persistence conflict. Please retry.',
				)
			}

			const reservation = await this.prisma.reservation.create({
				data: {
					id: reservationId,
					userId: params.userId,
					ticketTypeId: ticketType.id,
					quantity: params.quantity,
					status: 'PENDING',
					expiresAt,
					inventoryVersion: ticketType.inventory.version + 1,
				},
			})

			if (params.admissionRequired || this.config.queueEnabled) {
				await this.queue.revokeAdmissionLease(ticketType.eventId, ticketType.id, params.userId)
			}

			await this.publishAvailability(ticketType.eventId, ticketType.id, 'reservation_created')

			return { reservationId: reservation.id, expiresAt }
		} catch (error) {
			await this.client.eval(
				releaseInventoryScript,
				3,
				availabilityKey,
				reservedKey,
				pendingKey,
				params.quantity.toString(),
			)
			throw error
		}
	}

	async cancelReservation(reservationId: string, userId: string) {
		const reservation = await this.prisma.reservation.findUnique({
			where: { id: reservationId },
			include: { ticketType: true },
		})

		if (!reservation || reservation.userId !== userId) {
			reservationNotFound('Reservation not found.')
		}

		if (reservation.status !== 'PENDING') {
			reservationConflict(
				BookingErrorCode.ReservationConflict,
				'Only pending reservations can be cancelled.',
			)
		}

		await this.releaseReservationInventory(reservation, 'reservation_cancelled')

		return { cancelled: true }
	}

	async completeReservation(reservationId: string, userId: string) {
		const reservation = await this.prisma.reservation.findUnique({
			where: { id: reservationId },
			include: { ticketType: { include: { inventory: true, event: true } } },
		})

		if (!reservation || reservation.userId !== userId) {
			reservationNotFound('Reservation not found.')
		}

		if (reservation.status !== 'PENDING') {
			reservationConflict(BookingErrorCode.ReservationConflict, 'Reservation is not pending.')
		}

		if (reservation.expiresAt.getTime() <= Date.now()) {
			reservationConflict(BookingErrorCode.ReservationExpired, 'Reservation expired.')
		}

		const lock = await this.locks.acquire(`reservation:${reservationId}`, 3000, 2, 150)
		if (!lock) {
			reservationConflict(BookingErrorCode.LockConflict, 'Could not acquire reservation lock.')
		}

		try {
			const inventory = reservation.ticketType.inventory
			if (!inventory) {
				reservationConflict(BookingErrorCode.ReservationConflict, 'Inventory not found.')
			}

			const updated = await this.prisma.$transaction(async (tx) => {
				const update = await tx.ticketInventory.updateMany({
					where: { id: inventory.id, version: inventory.version },
					data: {
						reserved: inventory.reserved - reservation.quantity,
						sold: inventory.sold + reservation.quantity,
						version: { increment: 1 },
					},
				})

				if (update.count === 0) {
					return false
				}

				await tx.reservation.update({
					where: { id: reservation.id },
					data: { status: 'COMPLETED' },
				})
				await tx.booking.create({
					data: {
						reservationId: reservation.id,
						userId: reservation.userId,
						eventId: reservation.ticketType.eventId,
						ticketTypeId: reservation.ticketTypeId,
						quantity: reservation.quantity,
					},
				})
				return true
			})

			if (!updated) {
				reservationConflict(BookingErrorCode.ReservationConflict, 'Inventory update conflict.')
			}

			const reservedKey = redisKeys.reserved(
				reservation.ticketType.eventId,
				reservation.ticketTypeId,
			)
			const soldKey = redisKeys.sold(reservation.ticketType.eventId, reservation.ticketTypeId)
			const pendingKey = redisKeys.pending(
				'event',
				reservation.userId,
				reservation.ticketType.eventId,
			)

			await this.client.eval(
				completeInventoryScript,
				3,
				reservedKey,
				soldKey,
				pendingKey,
				reservation.quantity.toString(),
			)

			await this.publishAvailability(
				reservation.ticketType.eventId,
				reservation.ticketTypeId,
				'reservation_completed',
			)

			return { completed: true }
		} finally {
			await this.locks.release(lock)
		}
	}

	async expireReservation(reservationId: string) {
		const reservation = await this.prisma.reservation.findUnique({
			where: { id: reservationId },
			include: { ticketType: true },
		})

		if (!reservation) {
			return null
		}

		if (reservation.status !== 'PENDING') {
			return reservation
		}

		if (reservation.expiresAt.getTime() > Date.now()) {
			return reservation
		}

		await this.releaseReservationInventory(reservation, 'reservation_expired')
		return reservation
	}

	async getReservation(reservationId: string, userId: string) {
		const reservation = await this.prisma.reservation.findUnique({
			where: { id: reservationId },
			include: { ticketType: true },
		})

		if (!reservation || reservation.userId !== userId) {
			reservationNotFound('Reservation not found.')
		}

		return reservation
	}

	async getAvailabilitySnapshot(eventId: string): Promise<AvailabilitySnapshot> {
		const inventories = await this.prisma.ticketInventory.findMany({
			where: { ticketType: { eventId } },
			include: { ticketType: true },
		})

		return {
			eventId,
			items: inventories.map((inventory) => ({
				ticketTypeId: inventory.ticketTypeId,
				available: inventory.available,
				reserved: inventory.reserved,
				sold: inventory.sold,
				version: inventory.version,
			})),
		}
	}

	async reconcileInventory(eventId: string, ticketTypeId: string) {
		const inventory = await this.prisma.ticketInventory.findUnique({
			where: { ticketTypeId },
			include: { ticketType: true },
		})
		if (!inventory || inventory.ticketType.eventId !== eventId) {
			return null
		}

		const activeReservations = await this.prisma.reservation.aggregate({
			where: {
				ticketTypeId,
				status: 'PENDING',
			},
			_sum: { quantity: true },
		})
		const sold = await this.prisma.booking.aggregate({
			where: { ticketTypeId },
			_sum: { quantity: true },
		})

		const reserved = activeReservations._sum.quantity ?? 0
		const soldCount = sold._sum.quantity ?? 0
		const available = inventory.ticketType.totalCapacity - reserved - soldCount

		await this.prisma.ticketInventory.update({
			where: { id: inventory.id },
			data: {
				available,
				reserved,
				sold: soldCount,
				version: { increment: 1 },
			},
		})

		await this.prisma.inventoryAudit.create({
			data: {
				eventId,
				ticketTypeId,
				available,
				reserved,
				sold: soldCount,
				version: inventory.version + 1,
				reason: 'reconciliation',
			},
		})

		const availabilityKey = redisKeys.availability(eventId, ticketTypeId)
		const reservedKey = redisKeys.reserved(eventId, ticketTypeId)
		const soldKey = redisKeys.sold(eventId, ticketTypeId)

		await this.client.mset({
			[availabilityKey]: available.toString(),
			[reservedKey]: reserved.toString(),
			[soldKey]: soldCount.toString(),
		})

		await this.publishAvailability(eventId, ticketTypeId, 'reconciliation')
		return { available, reserved, sold: soldCount }
	}

	private async releaseReservationInventory(
		reservation: {
			id: string
			ticketTypeId: string
			userId: string
			quantity: number
			status: string
			expiresAt: Date
			inventoryVersion: number
			ticketType: { eventId: string }
		},
		reason: string,
	) {
		const lock = await this.locks.acquire(`reservation:${reservation.id}`, 3000, 2, 150)
		if (!lock) {
			reservationConflict(BookingErrorCode.LockConflict, 'Could not acquire reservation lock.')
		}

		try {
			await this.prisma.reservation.update({
				where: { id: reservation.id },
				data: { status: reason === 'reservation_expired' ? 'EXPIRED' : 'CANCELLED' },
			})

			const inventory = await this.prisma.ticketInventory.findUnique({
				where: { ticketTypeId: reservation.ticketTypeId },
			})

			if (inventory) {
				await this.prisma.ticketInventory.update({
					where: { id: inventory.id },
					data: {
						available: inventory.available + reservation.quantity,
						reserved: inventory.reserved - reservation.quantity,
						version: { increment: 1 },
					},
				})
			}

			const availabilityKey = redisKeys.availability(
				reservation.ticketType.eventId,
				reservation.ticketTypeId,
			)
			const reservedKey = redisKeys.reserved(
				reservation.ticketType.eventId,
				reservation.ticketTypeId,
			)
			const pendingKey = redisKeys.pending(
				'event',
				reservation.userId,
				reservation.ticketType.eventId,
			)

			await this.client.eval(
				releaseInventoryScript,
				3,
				availabilityKey,
				reservedKey,
				pendingKey,
				reservation.quantity.toString(),
			)

			await this.publishAvailability(
				reservation.ticketType.eventId,
				reservation.ticketTypeId,
				reason,
			)
		} finally {
			await this.locks.release(lock)
		}
	}

	private async ensureRedisInventory(
		eventId: string,
		ticketTypeId: string,
		inventory: { available: number; reserved: number; sold: number },
	) {
		const availabilityKey = redisKeys.availability(eventId, ticketTypeId)
		const reservedKey = redisKeys.reserved(eventId, ticketTypeId)
		const soldKey = redisKeys.sold(eventId, ticketTypeId)

		const existing = await this.client.mget(availabilityKey, reservedKey, soldKey)
		if (existing.every((value) => value !== null)) {
			return
		}

		await this.client.mset({
			[availabilityKey]: inventory.available.toString(),
			[reservedKey]: inventory.reserved.toString(),
			[soldKey]: inventory.sold.toString(),
		})
	}

	private async publishAvailability(eventId: string, ticketTypeId: string, reason: string) {
		const inventory = await this.prisma.ticketInventory.findUnique({
			where: { ticketTypeId },
		})
		if (!inventory) {
			return
		}

		const event: AvailabilityEvent = {
			eventId,
			ticketTypeId,
			available: inventory.available,
			reserved: inventory.reserved,
			sold: inventory.sold,
			version: inventory.version,
			reason,
		}

		this.availability.publish(event)

		if (inventory.available <= 0) {
			await this.queue.markSoldOut(eventId, ticketTypeId)
		}
	}
}
