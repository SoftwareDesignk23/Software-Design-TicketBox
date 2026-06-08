export class ErrorCode {
	// Common
	static readonly InternalServerError = new ErrorCode(
		'INTERNAL_SERVER_ERROR',
		'Internal server error.',
		500,
	)
	static readonly ValidationFailed = new ErrorCode(
		'VALIDATION_FAILED',
		'Request validation failed.',
		400,
	)

	// Auth
	static readonly AuthRequired = new ErrorCode('AUTH_REQUIRED', 'Authentication required.', 401)
	static readonly AuthInvalid = new ErrorCode(
		'AUTH_INVALID',
		'Authentication token is invalid.',
		401,
	)
	static readonly AuthTokenExpired = new ErrorCode(
		'AUTH_TOKEN_EXPIRED',
		'Authentication token expired.',
		401,
	)
	static readonly AuthInvalidCredentials = new ErrorCode(
		'AUTH_INVALID_CREDENTIALS',
		'Invalid credentials.',
		401,
	)
	static readonly AuthRefreshRequired = new ErrorCode(
		'AUTH_REFRESH_REQUIRED',
		'Refresh token required.',
		401,
	)
	static readonly AuthRefreshInvalid = new ErrorCode(
		'AUTH_REFRESH_INVALID',
		'Refresh token is invalid.',
		401,
	)
	static readonly AuthRefreshExpired = new ErrorCode(
		'AUTH_REFRESH_EXPIRED',
		'Refresh token expired.',
		401,
	)
	static readonly AuthRefreshReused = new ErrorCode(
		'AUTH_REFRESH_REUSED',
		'Refresh token reuse detected.',
		401,
	)
	static readonly AuthForbidden = new ErrorCode(
		'AUTH_FORBIDDEN',
		'You do not have access to this resource.',
		403,
	)
	static readonly AuthConcertForbidden = new ErrorCode(
		'AUTH_CONCERT_FORBIDDEN',
		'You are not assigned to this concert.',
		403,
	)
	static readonly AuthUserNotFound = new ErrorCode('AUTH_USER_NOT_FOUND', 'User not found.', 404)

	// Concerts
	static readonly ConcertNotFound = new ErrorCode('CONCERT_NOT_FOUND', 'Concert not found.', 404)
	static readonly ConcertValidationFailed = new ErrorCode(
		'CONCERT_VALIDATION_FAILED',
		'Concert payload is invalid.',
		400,
	)
	static readonly ConcertForbidden = new ErrorCode(
		'CONCERT_FORBIDDEN',
		'You can only manage concerts you organize.',
		403,
	)

	// Booking & Reservation
	static readonly ReservationNotFound = new ErrorCode(
		'RESERVATION_NOT_FOUND',
		'Reservation not found.',
		404,
	)
	static readonly ReservationExpired = new ErrorCode(
		'RESERVATION_EXPIRED',
		'Reservation expired.',
		409,
	)
	static readonly ReservationInvalid = new ErrorCode(
		'RESERVATION_INVALID',
		'Reservation is invalid.',
		400,
	)
	static readonly ReservationQuantityExceeded = new ErrorCode(
		'RESERVATION_QUANTITY_EXCEEDED',
		'Quantity exceeds per-order limit.',
		400,
	)
	static readonly BookingNotFound = new ErrorCode('BOOKING_NOT_FOUND', 'Booking not found.', 404)
	static readonly BookingInvalidStatus = new ErrorCode(
		'BOOKING_INVALID_STATUS',
		'Booking status does not allow this action.',
		409,
	)

	// Payment
	static readonly PaymentNotFound = new ErrorCode('PAYMENT_NOT_FOUND', 'Payment not found.', 404)
	static readonly PaymentInvalidProvider = new ErrorCode(
		'PAYMENT_INVALID_PROVIDER',
		'Payment provider is not supported.',
		400,
	)

	constructor(
		public readonly code: string,
		public readonly message: string,
		public readonly httpStatus: number,
	) {}
}
