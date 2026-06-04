import { Injectable } from '@nestjs/common'
import { Interval } from '@nestjs/schedule'
import { PrismaService } from '@/prisma/prisma.service.js'
import { BookingService } from './booking.service.js'
import { BookingQueueService } from './booking.queue.js'

@Injectable()
export class BookingWorker {
	constructor(
		private readonly prisma: PrismaService,
		private readonly booking: BookingService,
		private readonly queue: BookingQueueService,
	) {}

	@Interval(30000)
	async expireReservations() {
		const expired = await this.prisma.reservation.findMany({
			where: {
				status: 'PENDING',
				expiresAt: { lte: new Date() },
			},
			select: { id: true },
			orderBy: { expiresAt: 'asc' },
			take: 100,
		})

		for (const reservation of expired) {
			await this.booking.expireReservation(reservation.id)
		}
	}

	@Interval(300000)
	async reconcileInventory() {
		const ticketTypes = await this.prisma.ticketType.findMany({
			select: { id: true, eventId: true },
		})

		for (const ticketType of ticketTypes) {
			await this.booking.reconcileInventory(ticketType.eventId, ticketType.id)
		}
	}

	@Interval(10000)
	async expireAdmissions() {
		const ticketTypes = await this.prisma.ticketType.findMany({
			select: { id: true, eventId: true },
		})

		for (const ticketType of ticketTypes) {
			await this.queue.expireAdmissionLeases(ticketType.eventId, ticketType.id)
		}
	}
}
