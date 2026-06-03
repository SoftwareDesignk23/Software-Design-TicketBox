import { Reflector } from '@nestjs/core'
import { EventScopeGuard, RolesGuard } from './auth.guards.js'
import { AuthStore } from './auth.store.js'

const makeContext = (user: { sub: string; role: string }, eventId?: string) =>
	({
		switchToHttp: () => ({
			getRequest: () => ({
				user,
				params: eventId ? { eventId } : {},
			}),
		}),
		getHandler: () => undefined,
		getClass: () => undefined,
	}) as any

describe('Authorization guards', () => {
	it('allows matching role', () => {
		const reflector = {
			getAllAndOverride: () => ['ADMIN'],
		} as unknown as Reflector

		const guard = new RolesGuard(reflector)
		const context = makeContext({ sub: 'user-admin', role: 'ADMIN' })

		expect(guard.canActivate(context)).toBe(true)
	})

	it('blocks forbidden role', () => {
		const reflector = {
			getAllAndOverride: () => ['ADMIN'],
		} as unknown as Reflector

		const guard = new RolesGuard(reflector)
		const context = makeContext({ sub: 'user-audience', role: 'AUDIENCE' })

		expect(() => guard.canActivate(context)).toThrow()
	})

	it('blocks event without assignment', () => {
		const reflector = {
			getAllAndOverride: () => 'eventId',
		} as unknown as Reflector

		const guard = new EventScopeGuard(reflector, new AuthStore())
		const context = makeContext({ sub: 'user-organizer', role: 'ORGANIZER' }, 'event-404')

		expect(() => guard.canActivate(context)).toThrow()
	})

	it('allows assigned organizer event', () => {
		const reflector = {
			getAllAndOverride: () => 'eventId',
		} as unknown as Reflector

		const guard = new EventScopeGuard(reflector, new AuthStore())
		const context = makeContext({ sub: 'user-organizer', role: 'ORGANIZER' }, 'event-1')

		expect(guard.canActivate(context)).toBe(true)
	})
})
