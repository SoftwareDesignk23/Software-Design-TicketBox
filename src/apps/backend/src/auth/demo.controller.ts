import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
import { EventScope, Roles } from './auth.decorators.js'
import { EventScopeGuard, JwtAuthGuard, RolesGuard } from './auth.guards.js'

@Controller()
export class DemoController {
	@Get('audience/profile')
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles('AUDIENCE')
	getAudienceProfile() {
		return { status: 'ok', scope: 'audience-profile' }
	}

	@Get('organizer/events/:eventId')
	@UseGuards(JwtAuthGuard, RolesGuard, EventScopeGuard)
	@Roles('ORGANIZER', 'ADMIN')
	@EventScope('eventId')
	getOrganizerEvent(@Param('eventId') eventId: string) {
		return { status: 'ok', scope: 'organizer-event', eventId }
	}

	@Get('admin/overview')
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles('ADMIN')
	getAdminOverview() {
		return { status: 'ok', scope: 'admin-overview' }
	}

	@Post('checkin/events/:eventId/scan')
	@UseGuards(JwtAuthGuard, RolesGuard, EventScopeGuard)
	@Roles('CHECK_IN_STAFF')
	@EventScope('eventId')
	scanTicket(@Param('eventId') eventId: string) {
		return { status: 'ok', scope: 'checkin-scan', eventId }
	}
}
