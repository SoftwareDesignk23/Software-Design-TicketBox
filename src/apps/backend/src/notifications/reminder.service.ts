import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../prisma/prisma.service.js'
import { NotificationService } from './notification.service.js'

@Injectable()
export class ReminderService {
	private readonly logger = new Logger(ReminderService.name)

	constructor(
		private readonly prisma: PrismaService,
		private readonly notificationService: NotificationService,
	) {}

	@Cron(CronExpression.EVERY_HOUR)
	async handleConcertReminders() {
		this.logger.log('Checking for concert shows starting in 24 hours...')

		const now = new Date()
		const targetTimeStart = new Date(now.getTime() + 24 * 60 * 60 * 1000)
		const targetTimeEnd = new Date(targetTimeStart.getTime() + 60 * 60 * 1000) // 1 hour window

		const upcomingShows = await this.prisma.concertShow.findMany({
			where: {
				status: 'PUBLISHED',
				startsAt: {
					gte: targetTimeStart,
					lt: targetTimeEnd,
				},
			},
			select: { id: true, startsAt: true, concert: { select: { id: true, title: true } } },
		})

		if (upcomingShows.length === 0) {
			return
		}

		for (const show of upcomingShows) {
			this.logger.log(`Found upcoming show for: ${show.concert.title} (Show ID: ${show.id})`)

			// Find all tickets for this show
			const tickets = await this.prisma.ticket.findMany({
				where: {
					showId: show.id,
					status: 'ISSUED',
				},
				select: { ownerId: true },
				distinct: ['ownerId'],
			})

			for (const ticket of tickets) {
				try {
					await this.notificationService.sendNotification({
						userId: ticket.ownerId,
						type: 'SYSTEM_ALERT',
						channel: 'EMAIL',
						payload: {
							concertId: show.concert.id,
							message: `Reminder: The concert "${show.concert.title}" will start in 24 hours at ${show.startsAt.toISOString()}. Get ready!`,
						},
					})
				} catch (error) {
					this.logger.error(
						`Failed to send reminder for show ${show.id} to user ${ticket.ownerId}`,
						error,
					)
				}
			}
		}
	}
}
