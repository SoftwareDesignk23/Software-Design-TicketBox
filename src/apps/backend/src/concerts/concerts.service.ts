import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'

@Injectable()
export class ConcertsService {
	constructor(private readonly prisma: PrismaService) {}

	listConcerts() {
		return this.prisma.concert.findMany({
			where: { status: 'PUBLISHED' },
			orderBy: { startsAt: 'asc' },
			select: {
				id: true,
				title: true,
				description: true,
				venueName: true,
				venueAddress: true,
				startsAt: true,
				endsAt: true,
				salesOpensAt: true,
				status: true,
				heroImageUrl: true,
				organizer: {
					select: {
						id: true,
						displayName: true,
					},
				},
			},
		})
	}

	async getConcertById(id: string) {
		const concert = await this.prisma.concert.findFirst({
			where: {
				id,
				status: 'PUBLISHED',
			},
			select: {
				id: true,
				title: true,
				description: true,
				venueName: true,
				venueAddress: true,
				startsAt: true,
				endsAt: true,
				salesOpensAt: true,
				status: true,
				heroImageUrl: true,
				organizer: {
					select: {
						id: true,
						displayName: true,
					},
				},
			},
		})

		if (!concert) {
			throw new NotFoundException({
				statusCode: 404,
				error: 'Not Found',
				code: 'CONCERT_NOT_FOUND',
				message: 'Concert not found.',
			})
		}

		return concert
	}
}
