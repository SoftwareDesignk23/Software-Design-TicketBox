import { AppException } from '../exception/app-exception.js'
import { ErrorCode } from '../exception/error-code.js'

export function authRequired(): never {
	throw new AppException(ErrorCode.AuthRequired)
}

export function authForbidden(): never {
	throw new AppException(ErrorCode.AuthForbidden)
}

export function authConcertForbidden(): never {
	throw new AppException(ErrorCode.AuthConcertForbidden)
}
