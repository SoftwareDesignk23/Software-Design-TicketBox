import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
import { ConcertScope, Roles } from './auth.decorators.js'
import { ConcertScopeGuard, JwtAuthGuard, RolesGuard } from './auth.guards.js'

@Controller()
export class DemoController {
	@Get('audience/profile')
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles('AUDIENCE')
	getAudienceProfile() {
		return { status: 'ok', scope: 'audience-profile' }
	}

	@Get('organizer/concerts/:concertId')
	@UseGuards(JwtAuthGuard, RolesGuard, ConcertScopeGuard)
	@Roles('ORGANIZER', 'ADMIN')
	@ConcertScope('concertId')
	getOrganizerConcert(@Param('concertId') concertId: string) {
		return { status: 'ok', scope: 'organizer-concert', concertId }
	}

	@Get('admin/overview')
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles('ADMIN')
	getAdminOverview() {
		return { status: 'ok', scope: 'admin-overview' }
	}

	@Post('checkin/concerts/:concertId/scan')
	@UseGuards(JwtAuthGuard, RolesGuard, ConcertScopeGuard)
	@Roles('CHECK_IN_STAFF')
	@ConcertScope('concertId')
	scanTicket(@Param('concertId') concertId: string) {
		return { status: 'ok', scope: 'checkin-scan', concertId }
	}
}
