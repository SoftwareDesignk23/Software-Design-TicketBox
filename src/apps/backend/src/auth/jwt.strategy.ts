import { Inject, Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import type { ConfigType } from '@nestjs/config'
import { authConfig } from './auth.config.js'
import type { AuthTokenPayload } from './auth.types.js'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
	constructor(@Inject(authConfig.KEY) config: ConfigType<typeof authConfig>) {
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			ignoreExpiration: false,
			secretOrKey: config.signingSecret,
			issuer: config.issuer,
			audience: config.audience,
		})
	}

	validate(payload: AuthTokenPayload) {
		return payload
	}
}
