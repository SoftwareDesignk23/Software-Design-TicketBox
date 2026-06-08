import { Module } from '@nestjs/common'
import { CheckinController } from './checkin.controller.js'
import { CheckinService } from './checkin.service.js'
import { PrismaModule } from '../prisma/prisma.module.js'

@Module({
	imports: [PrismaModule],
	controllers: [CheckinController],
	providers: [CheckinService],
})
export class CheckinModule {}
