import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import { createConcertSchema, updateConcertSchema } from './concerts.dto.js'
import type { Role } from '../auth/auth.types.js'
import { AppException } from '../exception/app-exception.js'
import { ErrorCode } from '../exception/error-code.js'
import { RedisService } from '../redis/redis.service.js'
import { ConfigService } from '@nestjs/config'

const concertResponseSelect = {
	id: true,
	title: true,
	description: true,
	status: true,
	heroImageUrl: true,
	seatMapUrl: true,
	bannerUrl: true,
	venue: {
		select: {
			id: true,
			name: true,
			address: true,
			mapUrl: true,
			capacity: true,
		}
	},
	organizer: {
		select: {
			id: true,
			name: true,
			logoUrl: true,
			description: true,
		},
	},
	shows: {
		select: {
			id: true,
			startsAt: true,
			endsAt: true,
			salesOpensAt: true,
			status: true,
		},
		orderBy: {
			startsAt: 'asc' as const,
		}
	},
	artists: {
		select: {
			role: true,
			artist: {
				select: {
					id: true,
					name: true,
					avatarUrl: true,
					bio: true,
				}
			}
		}
	},
	sponsors: {
		select: {
			tier: true,
			sponsor: {
				select: {
					id: true,
					name: true,
					logoUrl: true,
				}
			}
		}
	},
	ticketTypes: {
		select: {
			id: true,
			name: true,
			price: true,
			totalQuantity: true,
			soldQuantity: true,
			maxPerOrder: true,
			colorCode: true,
			benefits: true,
		}
	},
} as const

@Injectable()
export class ConcertsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly redis: RedisService,
		private readonly config: ConfigService,
	) {}

	private get cacheTtl() {
		return parseInt(this.config.get<string>('CACHE_TTL') || '300', 10)
	}

	async listConcerts() {
		const cacheKey = 'concerts:list:published'
		const cached = await this.redis.get(cacheKey)
		if (cached) {
			return JSON.parse(cached)
		}

		const concerts = await this.prisma.concert.findMany({
			where: { status: 'PUBLISHED' },
			select: concertResponseSelect,
		})

		await this.redis.set(cacheKey, JSON.stringify(concerts), 'EX', this.cacheTtl)
		return concerts
	}

	async getConcertById(id: string) {
		const cacheKey = `concerts:detail:${id}`
		const cached = await this.redis.get(cacheKey)
		if (cached) {
			return JSON.parse(cached)
		}

		const concert = await this.prisma.concert.findFirst({
			where: {
				id,
				status: 'PUBLISHED',
			},
			select: concertResponseSelect,
		})

		if (!concert) {
			throw new AppException(ErrorCode.ConcertNotFound)
		}

		await this.redis.set(cacheKey, JSON.stringify(concert), 'EX', this.cacheTtl)
		return concert
	}

	async getShowSeats(showId: string) {
		const seats = await this.prisma.showSeat.findMany({
			where: { showId },
			include: {
				seat: {
					include: {
						section: true,
					}
				},
				ticketType: {
					select: {
						id: true,
						name: true,
						colorCode: true,
						price: true,
					}
				}
			},
			orderBy: [
				{ seat: { section: { sortOrder: 'asc' } } },
				{ seat: { row: 'asc' } },
				{ seat: { number: 'asc' } }
			]
		})

		const lockKeys = seats.map(s => `seat_lock:${s.id}`)
		if (lockKeys.length > 0) {
			const locks = await this.redis.mget(lockKeys)
			seats.forEach((seat, index) => {
				const lockedBy = locks[index]
				if (lockedBy) {
					;(seat as any).status = 'RESERVED'
					;(seat as any).lockedBy = lockedBy
				}
			})
		}

		return seats
	}

	async createConcert(body: unknown, organizerId: string) {
		const result = createConcertSchema.safeParse(body)

		if (!result.success) {
			throw new AppException(ErrorCode.ConcertValidationFailed, {
				fields: result.error.flatten().fieldErrors,
			})
		}

		const created = await this.prisma.concert.create({
			data: {
				...result.data,
				status: result.data.status ?? 'DRAFT',
				organizerId,
			},
			select: concertResponseSelect,
		})
		
		await this.redis.del('concerts:list:published')
		return created
	}

	async updateConcert(id: string, body: unknown, userId: string, role: Role) {
		const result = updateConcertSchema.safeParse(body)

		if (!result.success) {
			throw new AppException(ErrorCode.ConcertValidationFailed, {
				fields: result.error.flatten().fieldErrors,
			})
		}

		const concert = await this.prisma.concert.findUnique({
			where: { id },
			select: { id: true, organizerId: true },
		})

		if (!concert) {
			throw new AppException(ErrorCode.ConcertNotFound)
		}

		if (role !== 'ADMIN' && concert.organizerId !== userId) {
			throw new AppException(ErrorCode.ConcertForbidden)
		}

		const updated = await this.prisma.concert.update({
			where: { id },
			data: result.data,
			select: concertResponseSelect,
		})

		await this.redis.del('concerts:list:published')
		await this.redis.del(`concerts:detail:${id}`)
		return updated
	}

	async deleteConcert(id: string, userId: string, role: Role) {
		const concert = await this.prisma.concert.findUnique({
			where: { id },
			select: { id: true, organizerId: true },
		})

		if (!concert) {
			throw new AppException(ErrorCode.ConcertNotFound)
		}

		if (role !== 'ADMIN' && concert.organizerId !== userId) {
			throw new AppException(ErrorCode.ConcertForbidden)
		}

		await this.prisma.concert.delete({
			where: { id },
		})

		await this.redis.del('concerts:list:published')
		await this.redis.del(`concerts:detail:${id}`)

		return { deleted: true, id }
	}
}
