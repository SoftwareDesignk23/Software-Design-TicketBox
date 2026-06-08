import { Module } from '@nestjs/common'
import { NotificationController } from './notification.controller.js'
import { NotificationService } from './notification.service.js'
import { PrismaModule } from '../prisma/prisma.module.js'
import { EmailProvider } from './providers/email.provider.js'
import { InAppProvider } from './providers/in-app.provider.js'
import { NotificationProviderFactory } from './providers/notification-provider.factory.js'
import { ReminderService } from './reminder.service.js'

import { NotificationGateway } from './notification.gateway.js'

@Module({
	imports: [PrismaModule],
	controllers: [NotificationController],
	providers: [NotificationService, EmailProvider, InAppProvider, NotificationProviderFactory, ReminderService, NotificationGateway],
	exports: [NotificationService],
})
export class NotificationModule {}
