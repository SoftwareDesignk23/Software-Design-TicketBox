import { Reflector } from '@nestjs/core'
import { ConcertScopeGuard, RolesGuard } from './auth.guards.js'
import { AuthStore } from './auth.store.js'

const makeContext = (user: { sub: string; role: string }, concertId?: string) =>
	({
		switchToHttp: () => ({
			getRequest: () => ({
				user,
				params: concertId ? { concertId } : {},
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

	it('blocks concert without assignment', () => {
		const reflector = {
			getAllAndOverride: () => 'concertId',
		} as unknown as Reflector

		const guard = new ConcertScopeGuard(reflector, new AuthStore())
		const context = makeContext({ sub: 'user-organizer', role: 'ORGANIZER' }, 'concert-404')

		expect(() => guard.canActivate(context)).toThrow()
	})

	it('allows assigned organizer concert', () => {
		const reflector = {
			getAllAndOverride: () => 'concertId',
		} as unknown as Reflector

		const guard = new ConcertScopeGuard(reflector, new AuthStore())
		const context = makeContext({ sub: 'user-organizer', role: 'ORGANIZER' }, 'concert-1')

		expect(guard.canActivate(context)).toBe(true)
	})
})
