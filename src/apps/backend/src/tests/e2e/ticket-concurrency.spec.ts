import { randomUUID } from 'node:crypto'
import { BookingService } from '../../bookings/booking.service.js'
import { SeatGateway } from '../../concerts/seat.gateway.js'
import { AppException } from '../../exception/app-exception.js'
import { PrismaService } from '../../prisma/prisma.service.js'
import { RedisService } from '../../redis/redis.service.js'

const CAPACITY = 3
const CONCURRENT_REQUESTS = 6
const LOCK_RETRY_LIMIT = 50

class InMemoryRedisLock {
	private readonly values = new Map<string, string>()

	async set(key: string, value: string, ...args: unknown[]) {
		const nx = args.includes('NX')
		if (nx && this.values.has(key)) {
			return null
		}

		this.values.set(key, value)
		return 'OK'
	}

	async get(key: string) {
		return this.values.get(key) ?? null
	}

	async del(key: string) {
		return this.values.delete(key) ? 1 : 0
	}

	clear() {
		this.values.clear()
	}
}

class SilentSeatGateway {
	notifySeatUpdate() {}
}

const wait = (milliseconds: number) =>
	new Promise((resolve) => setTimeout(resolve, milliseconds))

describe('Ticket concurrency - oversell protection', () => {
	const fixtureId = randomUUID()
	const ids = {
		organizer: 'test-organizer-' + fixtureId,
		venue: 'test-venue-' + fixtureId,
		concert: 'test-concert-' + fixtureId,
		show: 'test-show-' + fixtureId,
		ticketType: 'test-ticket-type-' + fixtureId,
		user: 'test-user-' + fixtureId,
	}

	let prisma: PrismaService
	let bookingService: BookingService
	let redis: InMemoryRedisLock

	beforeAll(async () => {
		if (process.env.TEST_DATABASE_URL) {
			process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
		} else if (!process.env.DATABASE_URL) {
			process.loadEnvFile('.env')
		}

		if (!process.env.DATABASE_URL) {
			throw new Error('Set TEST_DATABASE_URL or DATABASE_URL before running this e2e test.')
		}

		prisma = new PrismaService()
		await prisma.$connect()

		redis = new InMemoryRedisLock()
		bookingService = new BookingService(
			prisma,
			redis as unknown as RedisService,
			new SilentSeatGateway() as unknown as SeatGateway,
		)

		await prisma.organizer.create({
			data: {
				id: ids.organizer,
				name: 'Concurrency test ' + fixtureId,
			},
		})
		await prisma.venue.create({
			data: {
				id: ids.venue,
				name: 'Concurrency test ' + fixtureId,
				address: 'Test only',
				capacity: CAPACITY,
			},
		})
		await prisma.concert.create({
			data: {
				id: ids.concert,
				title: 'Concurrency test ' + fixtureId,
				organizerId: ids.organizer,
				venueId: ids.venue,
				status: 'PUBLISHED',
			},
		})
		await prisma.concertShow.create({
			data: {
				id: ids.show,
				concertId: ids.concert,
				startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
				salesOpensAt: new Date(Date.now() - 60 * 1000),
			},
		})
		await prisma.ticketType.create({
			data: {
				id: ids.ticketType,
				concertId: ids.concert,
				name: 'Concurrency test ticket',
				price: 100_000,
				totalQuantity: CAPACITY,
				soldQuantity: 0,
				maxPerOrder: 4,
			},
		})
		await prisma.user.create({
			data: {
				id: ids.user,
				email: 'ticket-concurrency-' + fixtureId + '@test.local',
				displayName: 'Concurrency test user',
				role: 'AUDIENCE',
				passwordHash: 'not-used-by-this-test',
			},
		})
	}, 30_000)

	afterAll(async () => {
		redis?.clear()

		if (!prisma) return

		await prisma.booking.deleteMany({ where: { userId: ids.user } })
		await prisma.user.deleteMany({ where: { id: ids.user } })
		await prisma.concert.deleteMany({ where: { id: ids.concert } })
		await prisma.venue.deleteMany({ where: { id: ids.venue } })
		await prisma.organizer.deleteMany({ where: { id: ids.organizer } })
		await prisma.$disconnect()
	}, 30_000)

	async function reserveOneTicket(requestNumber: number) {
		for (let attempt = 0; attempt < LOCK_RETRY_LIMIT; attempt += 1) {
			try {
				return await bookingService.createBooking(
					{
						showId: ids.show,
						idempotencyKey: fixtureId + '-' + requestNumber,
						items: [{ ticketTypeId: ids.ticketType, quantity: 1 }],
					},
					ids.user,
				)
			} catch (error) {
				const lockBusy =
					error instanceof AppException &&
					error.code === 'INTERNAL_SERVER_ERROR' &&
					(error.details as { reason?: string } | undefined)?.reason ===
						'system_busy_try_again'

				if (!lockBusy || attempt === LOCK_RETRY_LIMIT - 1) {
					throw error
				}

				await wait(10)
			}
		}

		throw new Error('Lock retry limit reached')
	}

	it('never sells more tickets than the configured capacity', async () => {
		const attempts = Array.from({ length: CONCURRENT_REQUESTS }, (_, index) =>
			reserveOneTicket(index),
		)
		const results = await Promise.allSettled(attempts)

		const successfulRequests = results.filter(
			(result) => result.status === 'fulfilled',
		)
		const rejectedRequests = results.filter(
			(result) => result.status === 'rejected',
		)

		const ticketType = await prisma.ticketType.findUniqueOrThrow({
			where: { id: ids.ticketType },
			select: { soldQuantity: true, totalQuantity: true },
		})
		const bookingItems = await prisma.bookingItem.aggregate({
			where: {
				booking: { userId: ids.user },
				ticketTypeId: ids.ticketType,
			},
			_sum: { quantity: true },
		})

		expect(ticketType.soldQuantity).toBeLessThanOrEqual(ticketType.totalQuantity)
		expect(ticketType.soldQuantity).toBe(CAPACITY)
		expect(bookingItems._sum.quantity).toBe(ticketType.soldQuantity)
		expect(successfulRequests).toHaveLength(CAPACITY)
		expect(rejectedRequests).toHaveLength(CONCURRENT_REQUESTS - CAPACITY)
		expect(
			rejectedRequests.every(
				(result) =>
					result.status === 'rejected' &&
					result.reason instanceof AppException &&
					result.reason.code === 'RESERVATION_QUANTITY_EXCEEDED',
			),
		).toBe(true)
	}, 30_000)
})
