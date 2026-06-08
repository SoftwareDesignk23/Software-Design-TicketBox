import { AppException } from './app-exception.js'
import { ErrorCode } from './error-code.js'
import { HttpResponse } from '../http-response.js'
import { Catch, ExceptionFilter, ArgumentsHost } from '@nestjs/common'
import type { Response } from 'express'

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
	catch(exception: unknown, host: ArgumentsHost) {
		if (host.getType() !== 'http') {
			// If not an HTTP request (e.g. RabbitMQ/RPC), we should just throw or handle accordingly
			// Returning the exception or throwing it lets the RPC framework (like GoLevelUp) handle it (Nack/Ack)
			throw exception;
		}

		const context = host.switchToHttp()
		const response = context.getResponse<Response>()

		if (exception instanceof AppException) {
			response
				.status(exception.httpStatus)
				.json(HttpResponse.error(exception.message, exception.code, exception.details ?? null))
			return
		}

		console.error('Unhandled exception:', exception);

		response
			.status(ErrorCode.InternalServerError.httpStatus)
			.json(
				HttpResponse.error(
					ErrorCode.InternalServerError.message,
					ErrorCode.InternalServerError.code,
					{ error: exception instanceof Error ? exception.message : String(exception), stack: exception instanceof Error ? exception.stack : undefined },
				),
			)
	}
}
