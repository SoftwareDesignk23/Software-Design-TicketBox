import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard, RolesGuard } from '../auth/auth.guards.js'
import { Roles } from '../auth/auth.decorators.js'
import { EventsService } from './events.service.js'

@Controller('events')
export class EventsController {
	constructor(private readonly eventsService: EventsService) {}

	@Get()
	listEvents() {
		return this.eventsService.listEvents()
	}

	@Get(':id')
	getEventById(@Param('id') id: string) {
		return this.eventsService.getEventById(id)
	}

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
