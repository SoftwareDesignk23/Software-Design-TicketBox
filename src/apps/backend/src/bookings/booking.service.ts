import { Injectable, Inject, forwardRef } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service.js'
import { AppException } from '../exception/app-exception.js'
import { ErrorCode } from '../exception/error-code.js'
import { createBookingSchema } from './booking.dto.js'
import { RedisService } from '../redis/redis.service.js'
import { SeatGateway } from '../concerts/seat.gateway.js'

const BOOKING_TTL_MINUTES = 15

@Injectable()
export class BookingService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly redis: RedisService,
		@Inject(forwardRef(() => SeatGateway))
		private readonly seatGateway: SeatGateway,
	) {}

	async createBooking(body: unknown, userId: string) {
		const parsed = createBookingSchema.safeParse(body)
		if (!parsed.success) {
			throw new AppException(ErrorCode.ValidationFailed, {
				fields: parsed.error.flatten().fieldErrors,
			})
		}

		const { showId, items, idempotencyKey } = parsed.data

		const show = await this.prisma.concertShow.findUnique({
			where: { id: showId },
			select: { salesOpensAt: true, concertId: true },
		});
		if (!show) {
			throw new AppException(ErrorCode.ValidationFailed, { reason: 'show_not_found' });
		}
		if (show.salesOpensAt && new Date() < show.salesOpensAt) {
			throw new AppException(ErrorCode.ValidationFailed, { reason: 'ticket_sales_not_started' });
		}

		if (idempotencyKey) {
			const existing = await this.prisma.booking.findUnique({
				where: { idempotencyKey },
				include: { items: true },
			})
			if (existing) {
				return existing
			}
		}

		const ticketTypeIds = [...new Set(items.map((item) => item.ticketTypeId))]
		const ticketTypes = await this.prisma.ticketType.findMany({
			where: { id: { in: ticketTypeIds } },
		})

		if (ticketTypes.length !== ticketTypeIds.length) {
			throw new AppException(ErrorCode.ReservationInvalid, {
				reason: 'ticket_type_not_found',
			})
		}

		const ticketTypeMap = new Map(ticketTypes.map((type) => [type.id, type]))
		let totalAmount = new Prisma.Decimal(0)
		let currency = 'VND'

		// Extract all requested showSeatIds to lock them
		const showSeatIds = items.map((i) => i.showSeatId).filter(Boolean) as string[]

		// Check global ticket limit per user
		const existingTicketsCount = await this.prisma.ticket.groupBy({
			by: ['ticketTypeId'],
			where: {
				ownerId: userId,
				ticketTypeId: { in: ticketTypeIds },
				status: { in: ['ISSUED', 'CHECKED_IN'] },
			},
			_count: { _all: true },
		})
		const existingTicketsMap = new Map(existingTicketsCount.map(t => [t.ticketTypeId, (t._count as any)._all as number]))

		items.forEach((item) => {
			const ticketType = ticketTypeMap.get(item.ticketTypeId)
			if (!ticketType) {
				throw new AppException(ErrorCode.ReservationInvalid, {
					reason: 'ticket_type_not_found',
				})
			}
			const existingQty = existingTicketsMap.get(item.ticketTypeId) || 0
			if (existingQty + item.quantity > ticketType.maxPerOrder) {
				throw new AppException(ErrorCode.ReservationQuantityExceeded, {
					ticketTypeId: item.ticketTypeId,
					maxPerOrder: ticketType.maxPerOrder,
					existingTickets: existingQty,
					requestedQuantity: item.quantity,
					reason: 'global_limit_exceeded'
				})
			}
			totalAmount = totalAmount.plus(ticketType.price.mul(item.quantity))
			currency = ticketType.currency
		})

		let couponId: string | null = null;
		let discountAmount = new Prisma.Decimal(0);
		let finalAmount = totalAmount;

		if (parsed.data.couponCode) {
			const coupon = await this.prisma.coupon.findUnique({
				where: {
					code_concertId: {
						code: parsed.data.couponCode.toUpperCase(),
						concertId: show.concertId
					}
				}
			});
			if (!coupon || !coupon.isActive || coupon.usedCount >= coupon.maxUsage) {
				throw new AppException(ErrorCode.ValidationFailed, { reason: 'invalid_coupon' });
			}
			couponId = coupon.id;
			discountAmount = totalAmount.mul(coupon.discountPercentage).div(100);
			finalAmount = totalAmount.minus(discountAmount);
		}

		const expiresAt = new Date(Date.now() + BOOKING_TTL_MINUTES * 60 * 1000)

		const lockKey = `lock:show:${showId}:booking`
		const lockValue = `${userId}:${Date.now()}`
		const acquired = await this.redis.set(lockKey, lockValue, 'PX', 5000, 'NX')
		if (!acquired) {
			throw new AppException(ErrorCode.InternalServerError, {
				reason: 'system_busy_try_again',
			})
		}

		let result: any = null
		let seatsToUpdate: string[] = []
		let finalItems = [...items]
		
		try {
			result = await this.prisma.$transaction(async (tx) => {
				// 1. Lock explicit seats
				if (showSeatIds.length > 0) {
					const seats = await tx.showSeat.findMany({
						where: { id: { in: showSeatIds }, showId },
					})
					
					if (seats.length !== showSeatIds.length) {
						throw new AppException(ErrorCode.ValidationFailed, { reason: 'invalid_seats' })
					}

					// Check Redis locks for each seat
					const availableSeats: any[] = []
					for (const seat of seats) {
						if (seat.status !== 'AVAILABLE') continue;
						const lockOwner = await this.redis.get(`seat_lock:${seat.id}`)
						// If not locked, or locked by current user, it's available for this user
						if (!lockOwner || lockOwner === userId) {
							availableSeats.push(seat)
						}
					}
					seatsToUpdate = availableSeats.map(seat => seat.id)

					if (seatsToUpdate.length === 0) {
						throw new AppException(ErrorCode.ValidationFailed, { reason: 'all_seats_unavailable' })
					}

					await tx.showSeat.updateMany({
						where: { id: { in: seatsToUpdate } },
						data: { status: 'RESERVED' },
					})

					// Filter final items to exclude items with unavailable seats
					finalItems = finalItems.filter(item => !item.showSeatId || seatsToUpdate.includes(item.showSeatId))
					
					// Recalculate total amount
					totalAmount = new Prisma.Decimal(0)
					finalItems.forEach((item) => {
						const ticketType = ticketTypeMap.get(item.ticketTypeId)!
						totalAmount = totalAmount.plus(ticketType.price.mul(item.quantity))
					})
					if (couponId) {
						const coupon = await this.prisma.coupon.findUnique({ where: { id: couponId } });
						if (coupon) {
							discountAmount = totalAmount.mul(coupon.discountPercentage).div(100);
						}
					}
					finalAmount = totalAmount.minus(discountAmount);
				}

				// 2. Decrement inventory for ticket types
				for (const item of finalItems) {
					const currentType = await tx.ticketType.findUnique({
						where: { id: item.ticketTypeId },
					})

					if (!currentType || currentType.totalQuantity - currentType.soldQuantity < item.quantity) {
						throw new AppException(ErrorCode.ReservationQuantityExceeded, {
							ticketTypeId: item.ticketTypeId,
							reason: 'insufficient_capacity_at_checkout',
						})
					}

					const updated = await tx.ticketType.updateMany({
						where: {
							id: item.ticketTypeId,
							soldQuantity: currentType.soldQuantity,
						},
						data: {
							soldQuantity: { increment: item.quantity },
						},
					})

					if (updated.count === 0) {
						throw new AppException(ErrorCode.ReservationQuantityExceeded, {
							ticketTypeId: item.ticketTypeId,
							reason: 'concurrent_modification_try_again',
						})
					}
				}

				// Apply coupon usage with pessimistic lock
				if (couponId) {
					const lockedCoupons: any[] = await tx.$queryRaw`SELECT * FROM "Coupon" WHERE id = ${couponId} FOR UPDATE`;
					const currentCoupon = lockedCoupons[0];
					if (!currentCoupon || currentCoupon.usedCount >= currentCoupon.maxUsage || !currentCoupon.isActive) {
						throw new AppException(ErrorCode.ValidationFailed, { reason: 'coupon_exhausted' });
					}
					
					await tx.coupon.update({
						where: { id: couponId },
						data: { usedCount: { increment: 1 } }
					});
				}

				// 3. Create Booking
				const booking = await tx.booking.create({
					data: {
						userId,
						status: 'PENDING_PAYMENT',
						expiresAt,
						totalAmount: finalAmount,
						currency,
						idempotencyKey: idempotencyKey ?? null,
						couponId,
						discountAmount,
						items: {
							create: finalItems.map((item) => {
								const ticketType = ticketTypeMap.get(item.ticketTypeId)
								return {
									ticketTypeId: item.ticketTypeId,
									showSeatId: item.showSeatId ?? null,
									quantity: item.quantity,
									unitPrice: ticketType?.price ?? new Prisma.Decimal(0),
								}
							}),
						},
					},
					include: { items: true },
				})
				return booking
			})
		} finally {
			const currentLock = await this.redis.get(lockKey)
			if (currentLock === lockValue) {
				await this.redis.del(lockKey)
			}
		}

		if (result && seatsToUpdate.length > 0) {
			// Clear the temporary click locks
			for (const id of seatsToUpdate) {
				await this.redis.del(`seat_lock:${id}`)
			}
			this.seatGateway.notifySeatUpdate(showId, seatsToUpdate.map(id => ({ showSeatId: id, status: 'RESERVED' })))
		}

		return result
	}

	async getBooking(id: string, userId: string) {
		const booking = await this.prisma.booking.findFirst({
			where: { id, userId },
			include: { items: true, payments: true, tickets: true, coupon: true },
		})

		if (!booking) {
			throw new AppException(ErrorCode.BookingNotFound)
		}

		return booking
	}

	async getUserBookings(userId: string) {
		return this.prisma.booking.findMany({
			where: { userId },
			include: {
				items: {
					include: {
						ticketType: {
							select: { name: true, concert: { select: { title: true } } },
						},
						showSeat: {
							include: { seat: true }
						}
					},
				},
				tickets: true,
			},
			orderBy: { createdAt: 'desc' },
		})
	}
	async lockSeat(showSeatId: string, userId: string) {
		const showSeat = await this.prisma.showSeat.findUnique({
			where: { id: showSeatId },
			include: { seat: true }
		})

		if (!showSeat || showSeat.status !== 'AVAILABLE') {
			throw new AppException(ErrorCode.ValidationFailed, { reason: 'seat_not_available' })
		}

		const lockKey = `seat_lock:${showSeatId}`
		const lockValue = userId
		
		// Set lock for 15 minutes (900000 ms)
		const acquired = await this.redis.set(lockKey, lockValue, 'PX', 900000, 'NX')
		
		if (!acquired) {
			const currentLockOwner = await this.redis.get(lockKey)
			if (currentLockOwner !== userId) {
				throw new AppException(ErrorCode.ValidationFailed, { reason: 'seat_already_locked' })
			}
			// If it's the same user, just refresh the TTL
			await this.redis.set(lockKey, lockValue, 'PX', 900000)
		}

		// Notify clients
		this.seatGateway.notifySeatUpdate(showSeat.showId, [{ showSeatId, status: 'RESERVED', lockedBy: userId }])
		
		return { success: true }
	}

	async unlockSeat(showSeatId: string, userId: string) {
		const lockKey = `seat_lock:${showSeatId}`
		const currentLockOwner = await this.redis.get(lockKey)

		if (currentLockOwner === userId) {
			await this.redis.del(lockKey)
			
			const showSeat = await this.prisma.showSeat.findUnique({
				where: { id: showSeatId }
			})
			
			if (showSeat) {
				this.seatGateway.notifySeatUpdate(showSeat.showId, [{ showSeatId, status: 'AVAILABLE' }])
			}
		}

		return { success: true }
	}

	async applyCouponToBooking(bookingId: string, couponCode: string | undefined, userId: string) {
		return this.prisma.$transaction(async (tx) => {
			const booking = await tx.booking.findFirst({
				where: { id: bookingId, userId },
				include: { items: { include: { ticketType: true } } },
			})

			if (!booking) {
				throw new AppException(ErrorCode.BookingNotFound)
			}

			if (booking.status !== 'PENDING_PAYMENT') {
				throw new AppException(ErrorCode.BookingInvalidStatus, {
					reason: 'booking_not_pending_payment',
				})
			}

			// Calculate original total amount from items
			let originalTotal = new Prisma.Decimal(0)
			booking.items.forEach((item) => {
				originalTotal = originalTotal.plus(item.unitPrice.mul(item.quantity))
			})

			// If couponCode is empty or undefined, remove the coupon
			if (!couponCode || couponCode.trim() === '') {
				if (booking.couponId) {
					// Decrement previous coupon usedCount
					await tx.coupon.update({
						where: { id: booking.couponId },
						data: { usedCount: { decrement: 1 } },
					})
				}

				return tx.booking.update({
					where: { id: bookingId },
					data: {
						couponId: null,
						discountAmount: 0,
						totalAmount: originalTotal,
					},
					include: { items: true, coupon: true },
				})
			}

			const normalizedCode = couponCode.trim().toUpperCase()

			// If the same coupon code is already applied, do nothing
			if (booking.couponId) {
				const currentCoupon = await tx.coupon.findUnique({
					where: { id: booking.couponId }
				})
				if (currentCoupon && currentCoupon.code === normalizedCode) {
					return booking
				}
			}

			const firstItem = booking.items[0]
			if (!firstItem) {
				throw new AppException(ErrorCode.ValidationFailed, { reason: 'booking_has_no_items' })
			}
			const concertId = firstItem.ticketType.concertId

			// Find the new coupon
			const newCoupon = await tx.coupon.findUnique({
				where: {
					code_concertId: {
						code: normalizedCode,
						concertId: concertId,
					},
				},
			})

			if (!newCoupon) {
				throw new AppException(ErrorCode.ValidationFailed, { reason: 'invalid_coupon' })
			}

			if (!newCoupon.isActive) {
				throw new AppException(ErrorCode.ValidationFailed, { reason: 'coupon_inactive' })
			}

			// Pessimistic lock the coupon usage check
			const lockedCoupons: any[] = await tx.$queryRaw`SELECT * FROM "Coupon" WHERE id = ${newCoupon.id} FOR UPDATE`
			const lockedCoupon = lockedCoupons[0]
			if (!lockedCoupon || lockedCoupon.usedCount >= lockedCoupon.maxUsage || !lockedCoupon.isActive) {
				throw new AppException(ErrorCode.ValidationFailed, { reason: 'coupon_exhausted' })
			}

			// Decrement previous coupon usedCount if it existed
			if (booking.couponId) {
				await tx.coupon.update({
					where: { id: booking.couponId },
					data: { usedCount: { decrement: 1 } },
				})
			}

			// Increment new coupon usedCount
			await tx.coupon.update({
				where: { id: newCoupon.id },
				data: { usedCount: { increment: 1 } },
			})

			// Calculate discount
			const discountAmount = originalTotal.mul(newCoupon.discountPercentage).div(100)
			const finalAmount = originalTotal.minus(discountAmount)

			// Update booking
			return tx.booking.update({
				where: { id: bookingId },
				data: {
					couponId: newCoupon.id,
					discountAmount: discountAmount,
					totalAmount: finalAmount,
				},
				include: { items: true, coupon: true },
			})
		})
	}
}
