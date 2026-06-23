import { Body, Controller, Get, Post, UseGuards, Request } from '@nestjs/common'
import { AuthService } from './auth.service.js'
import { JwtAuthGuard } from './auth.guards.js'
import { CurrentUser } from './auth.decorators.js'
import type { AuthTokenPayload } from './auth.types.js'

@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Post('login')
	async login(@Body() body: { email: string; password: string }) {
		return this.authService.login(body.email, body.password)
	}

	@Post('register')
	async register(@Body() body: unknown, @Request() req: any) {
		const { registerSchema } = await import('./auth.dto.js')
		const { AppException } = await import('../exception/app-exception.js')
		const { ErrorCode } = await import('../exception/error-code.js')
		
		const parsed = registerSchema.safeParse(body)
		if (!parsed.success) {
			throw new AppException(ErrorCode.ValidationFailed, {
				fields: parsed.error.flatten().fieldErrors,
			})
		}
		
		let role = parsed.data.role || 'AUDIENCE'
		
		if (role !== 'AUDIENCE') {
			// Require ADMIN role to create higher roles
			const authHeader = req.headers.authorization
			if (!authHeader || !authHeader.startsWith('Bearer ')) {
				throw new AppException(ErrorCode.AuthRequired)
			}
			const token = authHeader.split(' ')[1]
			try {
				const payload = this.authService.verifyAccessToken(token)
				if (payload.role !== 'ADMIN') {
					throw new AppException(ErrorCode.AuthForbidden)
				}
			} catch (e) {
				throw new AppException(ErrorCode.AuthInvalid)
			}
		}

		return this.authService.register(parsed.data.email, parsed.data.password, parsed.data.displayName, role as any)
	}

	@Post('refresh')
	async refresh(@Body() body: { refreshToken: string }) {
		return this.authService.refresh(body.refreshToken)
	}

	@Post('logout')
	async logout(@Body() body: { refreshToken: string }) {
		return this.authService.logout(body.refreshToken)
	}

	@Post('staff')
	@UseGuards(JwtAuthGuard)
	async createStaff(@Body() body: unknown, @CurrentUser() user: AuthTokenPayload) {
		const { AppException } = await import('../exception/app-exception.js')
		const { ErrorCode } = await import('../exception/error-code.js')
		
		if (user.role !== 'ORGANIZER' && user.role !== 'ADMIN') {
			throw new AppException(ErrorCode.AuthForbidden)
		}

		const parsed = (await import('./auth.dto.js')).createStaffSchema.safeParse(body)
		if (!parsed.success) {
			throw new AppException(ErrorCode.ValidationFailed, {
				fields: parsed.error.flatten().fieldErrors,
			})
		}

		return this.authService.createStaff(parsed.data.assignedGateId, parsed.data.password, parsed.data.displayName, user.sub, user.role)
	}

	@Get('me')
	@UseGuards(JwtAuthGuard)
	getCurrentUser(@CurrentUser() user: AuthTokenPayload) {
		return this.authService.getCurrentUser(user.sub, user.role)
	}
}
