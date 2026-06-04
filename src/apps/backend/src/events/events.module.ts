import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module.js'
import { PrismaModule } from '../prisma/prisma.module.js'
import { EventsController } from './events.controller.js'
import { EventsService } from './events.service.js'

@Module({
	imports: [PrismaModule, AuthModule],
	controllers: [EventsController],
	providers: [EventsService],
})
export class EventsModule {}
