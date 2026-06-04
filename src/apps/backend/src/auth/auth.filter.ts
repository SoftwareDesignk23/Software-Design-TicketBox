import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	ForbiddenException,
	UnauthorizedException,
} from '@nestjs/common'
import { Response } from 'express'
import { AuthErrorCode } from './auth.errors.js'

@Catch(UnauthorizedException, ForbiddenException)
export class AuthHttpExceptionFilter implements ExceptionFilter {
	catch(exception: UnauthorizedException | ForbiddenException, host: ArgumentsHost) {
		const context = host.switchToHttp()
		const response = context.getResponse<Response>()
		const status = exception.getStatus()
		const payload = exception.getResponse()
		const payloadObject = typeof payload === 'string' ? { message: payload } : payload
		const message =
			typeof payloadObject === 'object' && 'message' in payloadObject
				? payloadObject.message
				: undefined
		const code =
			typeof payloadObject === 'object' && 'code' in payloadObject
				? payloadObject.code
				: status === 401
					? AuthErrorCode.AuthRequired
					: AuthErrorCode.AuthForbidden

		response.status(status).json({
			statusCode: status,
			error: status === 401 ? 'Unauthorized' : 'Forbidden',
			code,
			message:
				typeof message === 'string'
					? message
					: status === 401
						? 'Authentication required.'
						: 'Forbidden.',
		})
	}
}
