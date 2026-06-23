import { Controller, Get, Put, Post, Body, Param, UseGuards, Delete } from '@nestjs/common'
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

	@Get('jobs')
	listJobs(@CurrentUser() user: AuthTokenPayload) {
		return this.adminService.listJobs(user.sub, user.role)
	}

	@Get('jobs/:id')
	getJobStatus(@Param('id') id: string) {
		return this.adminService.getJobStatus(id)
	}

	@Get('shows/:id/guests')
	getShowGuests(@Param('id') id: string) {
		return this.adminService.getShowGuests(id)
	}

	@Post('jobs/:id/run')
	runJob(@Param('id') id: string) {
		return this.adminService.runJob(id)
	}

	@Get('artists')
	listArtists(@CurrentUser() user: AuthTokenPayload) {
		return this.adminService.listArtists(user.sub, user.role)
	}

	@Put('artists/:id')
	updateArtist(@Param('id') id: string, @Body() data: any) {
		return this.adminService.updateArtist(id, data)
	}

	@Delete('artists/:id')
	deleteArtist(@Param('id') id: string) {
		return this.adminService.deleteArtist(id)
	}

	@Get('venues')
	listVenues() {
		return this.adminService.listVenues()
	}

	@Post('venues')
	createVenue(@Body() data: any) {
		return this.adminService.createVenue(data)
	}
}
