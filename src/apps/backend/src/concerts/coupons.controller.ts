import { Controller, Post, Get, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { CouponsService } from './coupons.service.js';
import { CreateCouponDto, UpdateCouponDto } from './coupons.dto.js';
import { JwtAuthGuard } from '../auth/auth.guards.js';

@Controller('concerts/:id/coupons')
@UseGuards(JwtAuthGuard)
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post()
  createCoupon(
    @Param('id') concertId: string,
    @Body() dto: any,
    @Request() req: any
  ) {
    return this.couponsService.createCoupon(concertId, dto, req.user.userId);
  }

  @Get()
  getCoupons(
    @Param('id') concertId: string,
    @Request() req: any
  ) {
    return this.couponsService.getCoupons(concertId, req.user.userId);
  }

  @Patch(':couponId')
  updateCoupon(
    @Param('id') concertId: string,
    @Param('couponId') couponId: string,
    @Body() dto: any,
    @Request() req: any
  ) {
    return this.couponsService.updateCoupon(concertId, couponId, dto, req.user.userId);
  }
}
