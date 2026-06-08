import { ErrorCode } from './error-code.js'

export class AppException extends Error {
	code: string
	httpStatus: number
	details?: unknown

	constructor(errorCode: ErrorCode, details?: unknown) {
		super(errorCode.message)
		this.code = errorCode.code
		this.httpStatus = errorCode.httpStatus
		this.details = details
	}
}
