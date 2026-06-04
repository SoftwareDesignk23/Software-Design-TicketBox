import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard, RolesGuard } from '../auth/auth.guards.js'
import { Roles } from '../auth/auth.decorators.js'
import { ConcertsService } from './concerts.service.js'

@Controller('concerts')
export class ConcertsController {
	constructor(private readonly concertsService: ConcertsService) {}

	@Get()
	listConcerts() {
		return this.concertsService.listConcerts()
	}

	@Get(':id')
	getConcertById(@Param('id') id: string) {
		return this.concertsService.getConcertById(id)
	}

	@Post()
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles('ORGANIZER', 'ADMIN')
	createConcert(@Body() _body: unknown) {}

	@Patch(':id')
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles('ORGANIZER', 'ADMIN')
	updateConcert(@Param('id') _id: string, @Body() _body: unknown) {}

	@Delete(':id')
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles('ORGANIZER', 'ADMIN')
	deleteConcert(@Param('id') _id: string) {}
}
