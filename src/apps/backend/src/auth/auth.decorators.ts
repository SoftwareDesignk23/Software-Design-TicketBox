import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { Role } from './auth.types.js'

export const ROLE_METADATA_KEY = 'auth.roles'
export const CONCERT_SCOPE_METADATA_KEY = 'auth.concertScope'

export const Roles = (...roles: Role[]) => SetMetadata(ROLE_METADATA_KEY, roles)

export const ConcertScope = (paramName = 'concertId') =>
	SetMetadata(CONCERT_SCOPE_METADATA_KEY, paramName)

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext) => {
	const request = context.switchToHttp().getRequest()
	return request.user
})
