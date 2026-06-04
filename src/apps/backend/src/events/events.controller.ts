import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard, RolesGuard } from '../auth/auth.guards.js'
import { Roles } from '../auth/auth.decorators.js'

@Controller('events')
export class EventsController {
	@Get()
	listEvents() {}

	@Get(':id')
	getEventById(@Param('id') _id: string) {}

	@Post()
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles('ORGANIZER', 'ADMIN')
	createEvent(@Body() _body: unknown) {}

	@Patch(':id')
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles('ORGANIZER', 'ADMIN')
	updateEvent(@Param('id') _id: string, @Body() _body: unknown) {}

	@Delete(':id')
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles('ORGANIZER', 'ADMIN')
	deleteEvent(@Param('id') _id: string) {}
}
