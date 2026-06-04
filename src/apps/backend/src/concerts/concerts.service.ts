import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import { createConcertSchema } from './concerts.dto.js'

const concertResponseSelect = {
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
} as const

@Injectable()
export class ConcertsService {
	constructor(private readonly prisma: PrismaService) {}

	listConcerts() {
		return this.prisma.concert.findMany({
			where: { status: 'PUBLISHED' },
			orderBy: { startsAt: 'asc' },
			select: concertResponseSelect,
		})
	}

	async getConcertById(id: string) {
		const concert = await this.prisma.concert.findFirst({
			where: {
				id,
				status: 'PUBLISHED',
			},
			select: concertResponseSelect,
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

	createConcert(body: unknown, organizerId: string) {
		const result = createConcertSchema.safeParse(body) 

		if (!result.success) {
			throw new BadRequestException({
				statusCode: 400,
				error: 'Bad Request',
				code: 'CONCERT_VALIDATION_FAILED',
				message: 'Concert payload is invalid.',
				details: result.error.flatten().fieldErrors,
			})
		}

		return this.prisma.concert.create({
			data: {
				...result.data,
				status: result.data.status ?? 'DRAFT',
				organizerId,
			},
			select: concertResponseSelect,
		})
	}
}
