import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'

@Injectable()
export class EventsService {
	constructor(private readonly prisma: PrismaService) {}

	listEvents() {
		return this.prisma.event.findMany({
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

	async getEventById(id: string) {
		const event = await this.prisma.event.findFirst({
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

		if (!event) {
			throw new NotFoundException({
				statusCode: 404,
				error: 'Not Found',
				code: 'EVENT_NOT_FOUND',
				message: 'Event not found.',
			})
		}

		return event
	}
}
