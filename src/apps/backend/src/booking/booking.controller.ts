import { Body, Controller, Get, Param, Post, Sse, UseGuards } from '@nestjs/common'
import { Observable, filter, map } from 'rxjs'
import { JwtAuthGuard } from '../auth/auth.guards.js'
import { CurrentUser } from '../auth/auth.decorators.js'
import type { AuthTokenPayload } from '../auth/auth.types.js'
import { BookingService } from './booking.service.js'
import { BookingQueueService } from './booking.queue.js'
import { BookingAvailabilityService } from './booking.availability.js'

@Controller('booking')
@UseGuards(JwtAuthGuard)
export class BookingController {
	constructor(
		private readonly booking: BookingService,
		private readonly queue: BookingQueueService,
		private readonly availability: BookingAvailabilityService,
	) {}

	@Post('reservations')
	async createReservation(
		@CurrentUser() user: AuthTokenPayload,
		@Body() body: { ticketTypeId: string; quantity: number; admissionRequired?: boolean },
	) {
		return this.booking.createReservation({
			userId: user.sub,
			ticketTypeId: body.ticketTypeId,
			quantity: body.quantity,
			admissionRequired: body.admissionRequired ?? false,
		})
	}

	@Get('reservations/:reservationId')
	async getReservation(
		@CurrentUser() user: AuthTokenPayload,
		@Param('reservationId') reservationId: string,
	) {
		return this.booking.getReservation(reservationId, user.sub)
	}

	@Post('reservations/:reservationId/cancel')
	async cancelReservation(
		@CurrentUser() user: AuthTokenPayload,
		@Param('reservationId') reservationId: string,
	) {
		return this.booking.cancelReservation(reservationId, user.sub)
	}

	@Post('reservations/:reservationId/complete')
	async completeReservation(
		@CurrentUser() user: AuthTokenPayload,
		@Param('reservationId') reservationId: string,
	) {
		return this.booking.completeReservation(reservationId, user.sub)
	}

	@Post('queue/:eventId/:ticketTypeId/join')
	async joinQueue(
		@CurrentUser() user: AuthTokenPayload,
		@Param('eventId') eventId: string,
		@Param('ticketTypeId') ticketTypeId: string,
	) {
		return this.queue.joinQueue(eventId, ticketTypeId, user.sub)
	}

	@Post('queue/:eventId/:ticketTypeId/admit')
	async admitNext(@Param('eventId') eventId: string, @Param('ticketTypeId') ticketTypeId: string) {
		return this.queue.issueAdmissionLease(eventId, ticketTypeId)
	}

	@Get('queue/:eventId/:ticketTypeId/status')
	async queueStatus(
		@CurrentUser() user: AuthTokenPayload,
		@Param('eventId') eventId: string,
		@Param('ticketTypeId') ticketTypeId: string,
	) {
		return this.queue.getStatus(eventId, ticketTypeId, user.sub)
	}

	@Get('availability/:eventId')
	async getAvailabilitySnapshot(@Param('eventId') eventId: string) {
		return this.booking.getAvailabilitySnapshot(eventId)
	}

	@Sse('availability/:eventId/stream')
	availabilityStream(@Param('eventId') eventId: string): Observable<{ data: unknown }> {
		return this.availability.stream().pipe(
			filter((event) => event.eventId === eventId),
			map((event) => ({ data: event })),
		)
	}
}
