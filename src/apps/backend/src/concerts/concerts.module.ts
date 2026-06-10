import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module.js'
import { PrismaModule } from '../prisma/prisma.module.js'
import { RedisModule } from '../redis/redis.module.js'
import { ConcertsController } from './concerts.controller.js'
import { ConcertsService } from './concerts.service.js'
import { SeatGateway } from './seat.gateway.js'
import { CouponsController } from './coupons.controller.js'
import { CouponsService } from './coupons.service.js'

@Module({
	imports: [PrismaModule, AuthModule, RedisModule],
	controllers: [ConcertsController, CouponsController],
	providers: [ConcertsService, SeatGateway, CouponsService],
	exports: [ConcertsService, SeatGateway, CouponsService],
})
export class ConcertsModule {}
