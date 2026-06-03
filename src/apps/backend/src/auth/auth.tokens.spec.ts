import { ConfigType } from '@nestjs/config'
import { authConfig } from './auth.config.js'
import { AuthTokenService } from './auth.tokens.js'

describe('AuthTokenService', () => {
	it('signs and verifies access tokens', () => {
		const config = {
			issuer: 'ticketbox',
			audience: 'ticketbox-app',
			accessTokenTtlSeconds: 60,
			refreshTokenTtlSeconds: 300,
			signingSecret: 'test-secret-1234567890',
		} as ConfigType<typeof authConfig>

		const service = new AuthTokenService(config)
		const { token } = service.signAccessToken({
			sub: 'user-audience',
			role: 'AUDIENCE',
			sid: 'session-1',
		})

		const payload = service.verifyAccessToken(token)

		expect(payload.sub).toBe('user-audience')
		expect(payload.role).toBe('AUDIENCE')
		expect(payload.sid).toBe('session-1')
	})
})
