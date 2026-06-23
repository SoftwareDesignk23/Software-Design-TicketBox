import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import { AppException } from '../exception/app-exception.js'
import { ErrorCode } from '../exception/error-code.js'
import { sendNotificationSchema } from './notification.dto.js'
import { NotificationProviderFactory } from './providers/notification-provider.factory.js'
import { RabbitSubscribe, Nack, AmqpConnection } from '@golevelup/nestjs-rabbitmq'
import { NotificationGateway } from './notification.gateway.js'
import { withRetry } from '../utils/circuit-breaker.util.js'

@Injectable()
export class NotificationService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly providerFactory: NotificationProviderFactory,
		private readonly amqpConnection: AmqpConnection,
		private readonly notificationGateway: NotificationGateway,
	) {}

	async sendNotification(body: unknown) {
		const parsed = sendNotificationSchema.safeParse(body)
		if (!parsed.success) {
			throw new AppException(ErrorCode.ValidationFailed, {
				fields: parsed.error.flatten().fieldErrors,
			})
		}

		const user = await this.prisma.user.findUnique({
			where: { id: parsed.data.userId },
		})

		if (!user) {
			throw new AppException(ErrorCode.AuthUserNotFound)
		}

		const notification = await this.prisma.notification.create({
			data: {
				userId: parsed.data.userId,
				type: parsed.data.type,
				channel: parsed.data.channel,
				payload: parsed.data.payload || { concertId: parsed.data.concertId },
			},
		})

		let success = false
		try {
			const provider = this.providerFactory.getProvider(parsed.data.channel)
			success = await withRetry(
				() => provider.send({
					userId: user.id,
					recipient: parsed.data.channel === 'EMAIL' ? (parsed.data.payload?.attendeeEmail || user.email) : user.id,
					subject: `Notification for ${parsed.data.type}`,
					content: JSON.stringify(parsed.data.payload),
				}),
				3, 1000
			)

			const updated = await this.prisma.notification.update({
				where: { id: notification.id },
				data: { status: success ? 'SENT' : 'FAILED', sentAt: success ? new Date() : null },
			})

			if (success && parsed.data.channel === 'IN_APP') {
				this.notificationGateway.notifyNewNotification(user.id, updated)
			}

			return { id: notification.id, status: success ? 'SENT' : 'FAILED' }
		} catch (error) {
			await this.prisma.notification.update({
				where: { id: notification.id },
				data: { status: 'FAILED' },
			})
			throw new AppException(ErrorCode.InternalServerError, {
				reason: 'notification_failed',
			})
		}
	}

	async getUserNotifications(userId: string) {
		return this.prisma.notification.findMany({
			where: { userId },
			orderBy: { createdAt: 'desc' },
			take: 50,
		})
	}

	async markAsRead(userId: string, notificationId: string) {
		const notification = await this.prisma.notification.findUnique({
			where: { id: notificationId },
		})

		if (!notification || notification.userId !== userId) {
			throw new AppException(ErrorCode.InternalServerError, {
				reason: 'notification_not_found_or_unauthorized',
			})
		}

		return this.prisma.notification.update({
			where: { id: notificationId },
			data: { isRead: true },
		})
	}

	@RabbitSubscribe({
		exchange: 'ticketbox.exchange',
		routingKey: 'payment.success',
		queue: 'payment.success.queue',
		queueOptions: {
			deadLetterExchange: 'ticketbox.dlx',
			deadLetterRoutingKey: 'payment.success',
		},
	})
	async handlePaymentSuccess(data: any) {
		try {
			const { userId, ...payload } = data;
			
			await Promise.all([
				this.sendNotification({
					userId,
					type: 'BOOKING_CONFIRMED',
					channel: 'IN_APP',
					payload,
				}),
				this.sendNotification({
					userId,
					type: 'BOOKING_CONFIRMED',
					channel: 'EMAIL',
					payload,
				})
			]);
		} catch (error) {
			console.error('Failed to process payment.success, moving to DLQ:', error);
			// Trả về Nack(false) để KHÔNG requeue lại queue cũ, mà đẩy thẳng sang DLX (Dead Letter Exchange)
			return new Nack(false);
		}
	}

	@RabbitSubscribe({
		exchange: 'ticketbox.dlx',
		routingKey: 'payment.success',
		queue: 'ticketbox.dlq',
	})
	async handleDeadLetters(data: any, amqpMsg: any) {
		try {
			console.warn('Received message in DLQ, checking retry count...', data);
			
			// Check retry count via message headers (x-death)
			const deathHeader = amqpMsg?.properties?.headers?.['x-death'];
			let retryCount = 0;
			if (deathHeader && deathHeader.length > 0) {
				retryCount = deathHeader[0].count;
			}

			if (retryCount >= 3) {
				console.error('Message exceeded max retries (3), discarding:', data);
				// Ack to remove it permanently
				return;
			}

			console.log(`Retrying message (Attempt ${retryCount + 1})...`);
			// Delay retry intentionally
			await new Promise(resolve => setTimeout(resolve, 5000));
			
			// Re-publish to the original exchange to retry
			await this.amqpConnection.publish('ticketbox.exchange', 'payment.success', data);
		} catch (error) {
			console.error('DLQ handler failed:', error);
			return new Nack(false);
		}
	}
}

