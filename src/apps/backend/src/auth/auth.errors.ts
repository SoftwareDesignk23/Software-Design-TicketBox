import { ForbiddenException, UnauthorizedException } from '@nestjs/common'

export const AuthErrorCode = {
	AuthRequired: 'AUTH_REQUIRED',
	AuthInvalid: 'AUTH_INVALID',
	AuthInvalidCredentials: 'AUTH_INVALID_CREDENTIALS',
	AuthRefreshInvalid: 'AUTH_REFRESH_INVALID',
	AuthRefreshExpired: 'AUTH_REFRESH_EXPIRED',
	AuthRefreshReused: 'AUTH_REFRESH_REUSED',
	AuthForbidden: 'AUTH_FORBIDDEN',
	AuthEventForbidden: 'AUTH_EVENT_FORBIDDEN',
} as const

export type AuthErrorCode = (typeof AuthErrorCode)[keyof typeof AuthErrorCode]

export function unauthorized(code: AuthErrorCode, message: string): never {
	throw new UnauthorizedException({
		statusCode: 401,
		error: 'Unauthorized',
		code,
		message,
	})
}

export function forbidden(code: AuthErrorCode, message: string): never {
	throw new ForbiddenException({
		statusCode: 403,
		error: 'Forbidden',
		code,
		message,
	})
}
