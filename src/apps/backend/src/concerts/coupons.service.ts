import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppException } from '../exception/app-exception.js';
import { ErrorCode } from '../exception/error-code.js';
import { CreateCouponDto, UpdateCouponDto } from './coupons.dto.js';

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  private async checkOrganizerAccess(concertId: string, userId: string) {
    const concert = await this.prisma.concert.findFirst({
      where: {
        id: concertId,
        organizer: {
          users: { some: { id: userId } }
        }
      }
    });

    if (!concert) {
      throw new AppException(ErrorCode.AuthForbidden, { reason: 'not_concert_organizer' });
    }
    return concert;
  }

  async createCoupon(concertId: string, dto: CreateCouponDto, userId: string) {
    await this.checkOrganizerAccess(concertId, userId);

    const existing = await this.prisma.coupon.findUnique({
      where: {
        code_concertId: {
          code: dto.code.toUpperCase(),
          concertId
        }
      }
    });

    if (existing) {
      throw new AppException(ErrorCode.ValidationFailed, { reason: 'coupon_code_exists' });
    }

    return this.prisma.coupon.create({
      data: {
        code: dto.code.toUpperCase(),
        concertId,
        discountPercentage: dto.discountPercentage,
        maxUsage: dto.maxUsage,
      }
    });
  }

  async getCoupons(concertId: string, userId: string) {
    await this.checkOrganizerAccess(concertId, userId);

    return this.prisma.coupon.findMany({
      where: { concertId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { bookings: true }
        }
      }
    });
  }

  async updateCoupon(concertId: string, couponId: string, dto: UpdateCouponDto, userId: string) {
    await this.checkOrganizerAccess(concertId, userId);

    const coupon = await this.prisma.coupon.findFirst({
      where: { id: couponId, concertId }
    });

    if (!coupon) {
      throw new AppException(ErrorCode.ValidationFailed, { reason: 'coupon_not_found' });
    }

    return this.prisma.coupon.update({
      where: { id: couponId },
      data: { isActive: dto.isActive }
    });
  }
}
