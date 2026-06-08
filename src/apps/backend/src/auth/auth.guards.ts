import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { Reflector } from '@nestjs/core'
import { AppException } from '../exception/app-exception.js'
import { ErrorCode } from '../exception/error-code.js'
import { AuthStore } from './auth.store.js'
import { CONCERT_SCOPE_METADATA_KEY, ROLE_METADATA_KEY } from './auth.decorators.js'
import type { Role } from './auth.types.js'

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
	handleRequest<TUser = any>(
		err: any,
		user: any,
		info: any,
		_context: ExecutionContext,
		_status?: any,
	): TUser {
		if (err) {
			throw err
		}

		if (!user) {
			if (info?.message === 'No auth token') {
				throw new AppException(ErrorCode.AuthRequired)
			}
			if (info?.name === 'TokenExpiredError') {
				throw new AppException(ErrorCode.AuthTokenExpired)
			}
			throw new AppException(ErrorCode.AuthInvalid)
		}

		return user
	}
}

@Injectable()
export class RolesGuard implements CanActivate {
	constructor(private readonly reflector: Reflector) {}

	canActivate(context: ExecutionContext): boolean {
		const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLE_METADATA_KEY, [
			context.getHandler(),
			context.getClass(),
		])

		if (!requiredRoles || requiredRoles.length === 0) {
			return true
		}

		const request = context.switchToHttp().getRequest()
		const user = request.user as { role?: Role }

		if (!user?.role) {
			throw new AppException(ErrorCode.AuthRequired)
		}

		if (!requiredRoles.includes(user.role)) {
			throw new AppException(ErrorCode.AuthForbidden)
		}

		return true
	}
}

@Injectable()
export class ConcertScopeGuard implements CanActivate {
	constructor(
		private readonly reflector: Reflector,
		private readonly store: AuthStore,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const paramName = this.reflector.getAllAndOverride<string>(CONCERT_SCOPE_METADATA_KEY, [
			context.getHandler(),
			context.getClass(),
		])

		if (!paramName) {
			return true
		}

		const request = context.switchToHttp().getRequest()
		const user = request.user as { sub?: string; role?: Role }
		const concertId = request.params?.[paramName]

		if (!user?.sub || !user?.role) {
			throw new AppException(ErrorCode.AuthRequired)
		}

		if (!concertId) {
			throw new AppException(ErrorCode.AuthConcertForbidden)
		}

		const isAssigned = await this.store.isUserAssignedToConcert(user.sub, user.role, concertId)
		if (!isAssigned) {
			throw new AppException(ErrorCode.AuthConcertForbidden)
		}

		return true
	}
}
