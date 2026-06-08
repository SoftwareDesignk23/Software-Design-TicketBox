import { Module } from '@nestjs/common'
import { AdminController } from './admin.controller.js'
import { AdminService } from './admin.service.js'
import { UsersController } from './users.controller.js'
import { UsersService } from './users.service.js'
import { PrismaModule } from '../prisma/prisma.module.js'
import { RabbitMQModule } from '../rabbitmq/rabbitmq.module.js'

@Module({
	imports: [PrismaModule, RabbitMQModule],
	controllers: [AdminController, UsersController],
	providers: [AdminService, UsersService],
})
export class AdminModule {}
