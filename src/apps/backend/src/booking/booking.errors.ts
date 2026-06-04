import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'

export const BookingErrorCode = {
	BookingNotFound: 'BOOKING_NOT_FOUND',
	ReservationNotFound: 'RESERVATION_NOT_FOUND',
	ReservationExpired: 'RESERVATION_EXPIRED',
	ReservationCompleted: 'RESERVATION_COMPLETED',
	ReservationCancelled: 'RESERVATION_CANCELLED',
	ReservationConflict: 'RESERVATION_CONFLICT',
	ReservationPersistenceFailed: 'RESERVATION_PERSISTENCE_FAILED',
	InventoryInsufficient: 'INVENTORY_INSUFFICIENT',
	TicketLimitExceeded: 'TICKET_LIMIT_EXCEEDED',
	QueueAdmissionRequired: 'QUEUE_ADMISSION_REQUIRED',
	AdmissionLeaseExpired: 'ADMISSION_LEASE_EXPIRED',
	QueueSoldOut: 'QUEUE_SOLD_OUT',
	LockConflict: 'LOCK_CONFLICT',
} as const

export type BookingErrorCode = (typeof BookingErrorCode)[keyof typeof BookingErrorCode]

export function bookingNotFound(message: string): never {
	throw new NotFoundException({
		statusCode: 404,
		error: 'Not Found',
		code: BookingErrorCode.BookingNotFound,
		message,
	})
}

export function reservationNotFound(message: string): never {
	throw new NotFoundException({
		statusCode: 404,
		error: 'Not Found',
		code: BookingErrorCode.ReservationNotFound,
		message,
	})
}

export function reservationConflict(code: BookingErrorCode, message: string): never {
	throw new ConflictException({
		statusCode: 409,
		error: 'Conflict',
		code,
		message,
	})
}

export function bookingBadRequest(code: BookingErrorCode, message: string): never {
	throw new BadRequestException({
		statusCode: 400,
		error: 'Bad Request',
		code,
		message,
	})
}

export function ticketLimitExceeded(limit: number, remaining: number): never {
	throw new BadRequestException({
		statusCode: 400,
		error: 'Bad Request',
		code: BookingErrorCode.TicketLimitExceeded,
		message: 'Ticket limit exceeded.',
		limit,
		remaining,
	})
}
