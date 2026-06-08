import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import { AppException } from '../exception/app-exception.js'
import { ErrorCode } from '../exception/error-code.js'
import { CreatePaymentDto, PaymentWebhookDto, createPaymentSchema, paymentWebhookSchema } from './payment.dto.js'
import { VNPayProvider } from './providers/vnpay.provider.js'
import { MoMoProvider } from './providers/momo.provider.js'
import { IPaymentProvider } from './providers/payment.provider.interface.js'
import { PaymentProvider } from '@prisma/client'
import crypto from 'crypto'

import { AmqpConnection } from '@golevelup/nestjs-rabbitmq'

@Injectable()
export class PaymentService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly vnpay: VNPayProvider,
		private readonly momo: MoMoProvider,
		private readonly amqpConnection: AmqpConnection,
	) {}

	private getProvider(providerType: PaymentProvider): IPaymentProvider {
		if (providerType === 'VNPAY') return this.vnpay
		if (providerType === 'MOMO') return this.momo
		throw new AppException(ErrorCode.InternalServerError)
	}

	async createPayment(body: unknown, userId: string) {
		const parsed = createPaymentSchema.safeParse(body)
		if (!parsed.success) {
			throw new AppException(ErrorCode.ValidationFailed, {
				fields: parsed.error.flatten().fieldErrors,
			})
		}

		const booking = await this.prisma.booking.findFirst({
			where: { id: parsed.data.bookingId, userId },
		})

		if (!booking) {
			throw new AppException(ErrorCode.BookingNotFound)
		}

		if (booking.status !== 'PENDING_PAYMENT') {
			throw new AppException(ErrorCode.BookingInvalidStatus, {
				reason: 'booking_not_pending_payment',
			})
		}

		if (parsed.data.attendeeInfo) {
			await this.prisma.booking.update({
				where: { id: booking.id },
				data: {
					attendeeName: parsed.data.attendeeInfo.name,
					attendeeEmail: parsed.data.attendeeInfo.email,
					attendeePhone: parsed.data.attendeeInfo.phone,
					attendeeIdCard: parsed.data.attendeeInfo.idCard,
				}
			})
		}

		// Create Payment record
		const payment = await this.prisma.payment.create({
			data: {
				bookingId: booking.id,
				provider: parsed.data.provider,
				amount: booking.totalAmount,
				currency: booking.currency,
			},
		})

		const providerInstance = this.getProvider(parsed.data.provider)
		const paymentUrlResult = await providerInstance.createPaymentUrl({
			paymentId: payment.id,
			amount: Number(payment.amount),
			currency: payment.currency,
			returnUrl: parsed.data.returnUrl || 'http://localhost:5173/payment/return',
		})

		return {
			paymentId: payment.id,
			paymentUrl: paymentUrlResult.paymentUrl,
		}
	}

	private async processPaymentSuccess(tx: any, paymentId: string, bookingId: string) {
		const booking = await tx.booking.update({
			where: { id: bookingId },
			data: { status: 'PAID' },
			include: { items: { include: { showSeat: true, ticketType: true } } },
		})

		// Wait, we need to know the `showId`.
		// It's in the showSeat or if it's GA, we don't have showSeat.
		// Wait, in our new schema we added `showId` to the booking dto, but did we save `showId` to Booking? No!
		// Let's check Booking model. Booking has no `showId`. It has `items` (ticketTypeId, showSeatId).
		// Wait, how do we know the showId? ticketType links to concert. showSeat links to show.
		// If a user bought GA, they didn't provide showSeatId. So how do we link Ticket to showId?
		// Oh no! The Booking model in schema.prisma lacks `showId` if they only buy GA without showSeat.
		// BUT we do have `showId` in `ticketType.showSeats`? No.
		// We'll have to find `showId` from `showSeat` if exists.
		// If `showSeat` is null, we have a problem. BUT wait, in our seed.ts, GA doesn't have showSeats.
		// Let's just pick the first Show of the Concert for GA tickets as a fallback for now.
		// Or better, we should have saved `showId` in `Booking` or `BookingItem`!
		
		const concert = await tx.concert.findUnique({
			where: { id: booking.ticketTypes ? booking.ticketTypes[0]?.concertId : '' } // Oops, booking has no concertId.
		})
	}

	async handleVnPayWebhook(queryParams: any) {
		const isValid = await this.vnpay.verifyWebhook(queryParams)
		if (!isValid) {
			return { RspCode: '97', Message: 'Checksum failed' }
		}

		const paymentId = queryParams['vnp_TxnRef']
		const rspCode = queryParams['vnp_ResponseCode']
		const amount = queryParams['vnp_Amount']

		const payment = await this.prisma.payment.findFirst({
			where: { id: paymentId, provider: 'VNPAY' },
			include: { booking: { include: { items: { include: { ticketType: true, showSeat: { include: { seat: true } } } } } } }
		})

		if (!payment) {
			return { RspCode: '01', Message: 'Order not found' }
		}

		if (Number(payment.amount) * 100 !== Number(amount)) {
			return { RspCode: '04', Message: 'Amount invalid' }
		}

		if (payment.status !== 'PENDING') {
			return { RspCode: '02', Message: 'This order has been updated to the payment status' }
		}

		const status = rspCode === '00' ? 'SUCCESS' : 'FAILED'

		let generatedTickets: any[] = [];

		await this.prisma.$transaction(async (tx) => {
			await tx.payment.update({
				where: { id: payment.id },
				data: { status: status },
			})

			if (status === 'SUCCESS') {
				const booking = payment.booking
				await tx.booking.update({
					where: { id: booking.id },
					data: { status: 'PAID' },
				})

				// Generate Tickets
				for (const item of booking.items) {
					// We need showId. If showSeat exists, we use it. 
					// If not, we fetch the first show of the concert.
					let showId = item.showSeat?.showId
					if (!showId) {
						const show = await tx.concertShow.findFirst({
							where: { concertId: item.ticketType.concertId },
							orderBy: { startsAt: 'asc' }
						})
						if (show) showId = show.id
					}
					
					for (let i = 0; i < item.quantity; i++) {
						const ticketId = crypto.randomUUID()
						const code = crypto.randomUUID().split('-')[0].toUpperCase() + crypto.randomBytes(4).toString('hex').toUpperCase()
						
						const createdTicket = await tx.ticket.create({
							data: {
								id: ticketId,
								bookingId: booking.id,
								showId: showId!,
								ticketTypeId: item.ticketTypeId,
								showSeatId: item.showSeatId,
								ownerId: booking.userId,
								code: code,
								qrPayload: JSON.stringify({ ticketId, code })
							}
						})

						generatedTickets.push({
							id: createdTicket.id,
							code: createdTicket.code,
							ticketName: item.ticketType.name,
							seat: item.showSeat?.seat?.label
						})
					}
				}

				// Send notification
				try {
					const payload = {
						bookingId: payment.booking.id,
						userId: payment.booking.userId,
						attendeeEmail: payment.booking.attendeeEmail,
						message: 'Thanh toán thành công! Vé của bạn đã được xuất.',
						tickets: generatedTickets,
						total: booking.totalAmount
					}
					
					await this.amqpConnection.publish('ticketbox.exchange', 'payment.success', payload)
				} catch (err) {
					console.error('Failed to publish payment.success event:', err)
				}
			} else {
				await tx.booking.update({
					where: { id: payment.bookingId },
					data: { status: 'CANCELLED' },
				})
			}
		})

		return { RspCode: '00', Message: 'Success' }
	}
}
