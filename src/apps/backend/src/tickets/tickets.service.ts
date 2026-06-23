import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'

@Injectable()
export class TicketsService {
	constructor(private readonly prisma: PrismaService) {}

	async getUserTickets(userId: string) {
		const tickets = await this.prisma.ticket.findMany({
			where: { ownerId: userId },
			include: {
				show: {
					include: {
						concert: {
							include: { venue: true }
						}
					}
				},
				showSeat: {
					include: { seat: { include: { section: true } } }
				},
				ticketType: {
					select: {
						name: true,
						price: true,
					},
				},
				gate: true,
			},
			orderBy: {
				issuedAt: 'desc',
			},
		})

		return tickets.map((t) => ({
			id: t.id,
			code: t.code,
			qrPayload: t.qrPayload,   // JWT-signed token — encode this in the QR, not 'code'
			status: t.status,
			eventName: t.show.concert.title,
			eventId: t.show.concertId,
			venue: t.show.concert.venue.name,
			date: t.show.startsAt,
			seats: t.showSeat ? `${t.showSeat.seat.section.name.replace(/ - [0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '')} - ${t.showSeat.seat.label}` : 'GA', // GA for general admission
			tier: t.ticketType.name,
			gate: t.gate?.name || null,
		}))
	}
}

