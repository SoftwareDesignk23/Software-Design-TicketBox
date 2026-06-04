import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module.js'
import { PrismaModule } from '../prisma/prisma.module.js'
import { ConcertsController } from './concerts.controller.js'
import { ConcertsService } from './concerts.service.js'

@Module({
	imports: [PrismaModule, AuthModule],
	controllers: [ConcertsController],
	providers: [ConcertsService],
})
export class ConcertsModule {}
