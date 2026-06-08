import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module.js'
import { PrismaModule } from '../prisma/prisma.module.js'
import { RedisModule } from '../redis/redis.module.js'
import { ConcertsController } from './concerts.controller.js'
import { ConcertsService } from './concerts.service.js'
import { SeatGateway } from './seat.gateway.js'

@Module({
	imports: [PrismaModule, AuthModule, RedisModule],
	controllers: [ConcertsController],
	providers: [ConcertsService, SeatGateway],
	exports: [ConcertsService, SeatGateway],
})
export class ConcertsModule {}
