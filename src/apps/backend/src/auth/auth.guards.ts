import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AuthTokenService } from './auth.tokens.js'
import { AuthStore } from './auth.store.js'
import { EVENT_SCOPE_METADATA_KEY, ROLE_METADATA_KEY } from './auth.decorators.js'
import { AuthErrorCode, forbidden, unauthorized } from './auth.errors.js'
import type { Role } from './auth.types.js'

@Injectable()
export class JwtAuthGuard implements CanActivate {
	constructor(private readonly tokens: AuthTokenService) {}

	canActivate(context: ExecutionContext): boolean {
		const request = context.switchToHttp().getRequest()
		const header = request.headers.authorization

		if (!header) {
			throw new UnauthorizedException({
				statusCode: 401,
				error: 'Unauthorized',
				code: AuthErrorCode.AuthRequired,
				message: 'Authentication token required.',
			})
		}

		const [scheme, token] = header.split(' ')

		if (scheme !== 'Bearer' || !token) {
			throw new UnauthorizedException({
				statusCode: 401,
				error: 'Unauthorized',
				code: AuthErrorCode.AuthInvalid,
				message: 'Invalid authentication token.',
			})
		}

		try {
			const payload = this.tokens.verifyAccessToken(token)
			request.user = payload
			return true
		} catch (error) {
			throw new UnauthorizedException({
				statusCode: 401,
				error: 'Unauthorized',
				code: AuthErrorCode.AuthInvalid,
				message: 'Access token is invalid or expired.',
			})
		}
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
			unauthorized(AuthErrorCode.AuthRequired, 'Authentication required.')
		}

		if (!requiredRoles.includes(user.role)) {
			forbidden(AuthErrorCode.AuthForbidden, 'You do not have access to this resource.')
		}

		return true
	}
}

@Injectable()
export class EventScopeGuard implements CanActivate {
	constructor(
		private readonly reflector: Reflector,
		private readonly store: AuthStore,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const paramName = this.reflector.getAllAndOverride<string>(EVENT_SCOPE_METADATA_KEY, [
			context.getHandler(),
			context.getClass(),
		])

		if (!paramName) {
			return true
		}

		const request = context.switchToHttp().getRequest()
		const user = request.user as { sub?: string; role?: Role }
		const eventId = request.params?.[paramName]

		if (!user?.sub || !user?.role) {
			unauthorized(AuthErrorCode.AuthRequired, 'Authentication required.')
		}

		if (!eventId) {
			forbidden(AuthErrorCode.AuthEventForbidden, 'Missing event scope.')
		}

		const isAssigned = await this.store.isUserAssignedToEvent(user.sub, user.role, eventId)
		if (!isAssigned) {
			forbidden(AuthErrorCode.AuthEventForbidden, 'You are not assigned to this event.')
		}

		return true
	}
}
