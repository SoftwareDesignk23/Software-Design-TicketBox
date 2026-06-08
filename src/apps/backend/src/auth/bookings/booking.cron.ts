import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../../prisma/prisma.service.js'
import { SeatGateway } from '../../concerts/seat.gateway.js'

@Injectable()
export class BookingCronService {
	private readonly logger = new Logger(BookingCronService.name)

	constructor(
		private readonly prisma: PrismaService,
		private readonly seatGateway: SeatGateway,
	) {}

	@Cron(CronExpression.EVERY_MINUTE)
	async releaseExpiredBookings() {
		try {
			const expiredBookings = await this.prisma.booking.findMany({
				where: {
					status: 'PENDING_PAYMENT',
					expiresAt: { lt: new Date() },
				},
				include: { items: true },
			})

			if (expiredBookings.length === 0) return

			for (const booking of expiredBookings) {
				await this.prisma.$transaction(async (tx) => {
					// 1. Mark booking as cancelled
					await tx.booking.update({
						where: { id: booking.id },
						data: { status: 'CANCELLED' },
					})

					// 2. Release explicit seats
					const showSeatIds = booking.items.map(item => item.showSeatId).filter(Boolean) as string[]
					if (showSeatIds.length > 0) {
						await tx.showSeat.updateMany({
							where: { id: { in: showSeatIds } },
							data: { status: 'AVAILABLE' },
						})

						// Find the showId from one of the seats to broadcast
						const firstSeat = await tx.showSeat.findUnique({ where: { id: showSeatIds[0] } })
						if (firstSeat) {
							this.seatGateway.notifySeatUpdate(
								firstSeat.showId,
								showSeatIds.map(id => ({ showSeatId: id, status: 'AVAILABLE' }))
							)
						}
					}

					// 3. Increment inventory back
					for (const item of booking.items) {
						await tx.ticketType.update({
							where: { id: item.ticketTypeId },
							data: { soldQuantity: { decrement: item.quantity } },
						})
					}
				})

				this.logger.log(`Released expired booking ${booking.id}`)
			}
		} catch (error) {
			this.logger.error('Failed to release expired bookings', error)
		}
	}
}
