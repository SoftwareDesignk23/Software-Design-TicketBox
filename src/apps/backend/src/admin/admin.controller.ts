import { Controller, Get, UseGuards } from '@nestjs/common'
import { JwtAuthGuard, RolesGuard } from '../auth/auth.guards.js'
import { CurrentUser, Roles } from '../auth/auth.decorators.js'
import type { AuthTokenPayload } from '../auth/auth.types.js'
import { AdminService } from './admin.service.js'

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'ORGANIZER')
export class AdminController {
	constructor(private readonly adminService: AdminService) {}

	@Get('stats')
	getStats(@CurrentUser() user: AuthTokenPayload) {
		return this.adminService.getStats(user.sub, user.role)
	}

	@Get('concerts')
	listConcerts(@CurrentUser() user: AuthTokenPayload) {
		return this.adminService.listConcerts(user.sub, user.role)
	}
}
