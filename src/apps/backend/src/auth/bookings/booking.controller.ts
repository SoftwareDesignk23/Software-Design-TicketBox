import { Controller, Post, Body, Get, Param, UseGuards, Request } from '@nestjs/common'
import { BookingService } from './booking.service.js'
import { JwtAuthGuard, RolesGuard } from '../auth.guards.js'
import { Roles } from '../auth.decorators.js'

@Controller('bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BookingController {
	constructor(private readonly bookingService: BookingService) {}

	@Post('reservations') // Keep the same endpoint for backward compatibility with frontend, but it creates a Booking now
	@Roles('AUDIENCE')
	async createBooking(@Body() body: unknown, @Request() req: any) {
		return this.bookingService.createBooking(body, req.user.sub)
	}

	@Post('seats/lock')
	@Roles('AUDIENCE')
	async lockSeat(@Body() body: { showSeatId: string }, @Request() req: any) {
		return this.bookingService.lockSeat(body.showSeatId, req.user.sub)
	}

	@Post('seats/unlock')
	@Roles('AUDIENCE')
	async unlockSeat(@Body() body: { showSeatId: string }, @Request() req: any) {
		return this.bookingService.unlockSeat(body.showSeatId, req.user.sub)
	}

	@Get()
	@Roles('AUDIENCE')
	async getUserBookings(@Request() req: any) {
		return this.bookingService.getUserBookings(req.user.sub)
	}

	@Get(':id')
	@Roles('AUDIENCE')
	async getBooking(@Param('id') id: string, @Request() req: any) {
		return this.bookingService.getBooking(id, req.user.sub)
	}

	@Post(':id/coupon')
	@Roles('AUDIENCE')
	async applyCoupon(
		@Param('id') bookingId: string,
		@Body() body: { code?: string },
		@Request() req: any
	) {
		return this.bookingService.applyCouponToBooking(bookingId, body.code, req.user.sub)
	}
}
