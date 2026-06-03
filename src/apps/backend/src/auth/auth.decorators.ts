import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { Role } from './auth.types.js'

export const ROLE_METADATA_KEY = 'auth.roles'
export const EVENT_SCOPE_METADATA_KEY = 'auth.eventScope'

export const Roles = (...roles: Role[]) => SetMetadata(ROLE_METADATA_KEY, roles)

export const EventScope = (paramName = 'eventId') =>
	SetMetadata(EVENT_SCOPE_METADATA_KEY, paramName)

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext) => {
	const request = context.switchToHttp().getRequest()
	return request.user
})
