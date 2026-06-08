import { Module, forwardRef } from '@nestjs/common'
import { BookingController } from './booking.controller.js'
import { BookingService } from './booking.service.js'
import { PrismaModule } from '../../prisma/prisma.module.js'
import { AuthModule } from '../auth.module.js'
import { ConcertsModule } from '../../concerts/concerts.module.js'
import { BookingCronService } from './booking.cron.js'
import { SeatGateway } from '../../concerts/seat.gateway.js'

@Module({
	imports: [PrismaModule, AuthModule, forwardRef(() => ConcertsModule)],
	controllers: [BookingController],
	providers: [BookingService, BookingCronService],
	exports: [BookingService],
})
export class BookingModule {}
