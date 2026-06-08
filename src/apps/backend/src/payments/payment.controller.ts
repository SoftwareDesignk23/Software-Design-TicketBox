import { Controller, Post, Get, Body, UseGuards, Request, HttpCode } from '@nestjs/common'
import { PaymentService } from './payment.service.js'
import { JwtAuthGuard, RolesGuard } from '../auth/auth.guards.js'
import { Roles } from '../auth/auth.decorators.js'

@Controller('payments')
export class PaymentController {
	constructor(private readonly paymentService: PaymentService) {}

	@Post('create')
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles('AUDIENCE')
	async createPayment(@Body() body: unknown, @Request() req: any) {
		return this.paymentService.createPayment(body, req.user.sub)
	}

	@Get('webhook/vnpay_ipn')
	async handleVnPayIpn(@Request() req: any) {
		const queryParams = req.query
		const result = await this.paymentService.handleVnPayWebhook(queryParams)
		return result
	}
}
