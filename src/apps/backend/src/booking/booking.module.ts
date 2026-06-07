import { Module } from '@nestjs/common'
import { BookingController } from './booking.controller.js'
import { BookingService } from './booking.service.js'
import { BookingAvailabilityService } from './booking.availability.js'
import { BookingQueueService } from './booking.queue.js'
import { BookingWorker } from './booking.worker.js'
import { DistributedLockService } from './booking.lock.js'
import { PrismaModule } from '../prisma/prisma.module.js'
import { RedisModule } from '../redis/redis.module.js'
import { AuthModule } from '../auth/auth.module.js'

@Module({
	imports: [PrismaModule, RedisModule, AuthModule],
	controllers: [BookingController],
	providers: [
		BookingService,
		BookingAvailabilityService,
		BookingQueueService,
		BookingWorker,
		DistributedLockService,
	],
})
export class BookingModule {}
