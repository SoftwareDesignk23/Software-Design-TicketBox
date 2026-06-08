import { Module } from '@nestjs/common'
import { PaymentController } from './payment.controller.js'
import { PaymentService } from './payment.service.js'
import { PrismaModule } from '../prisma/prisma.module.js'
import { NotificationModule } from '../notifications/notification.module.js'
import { VNPayProvider } from './providers/vnpay.provider.js'
import { MoMoProvider } from './providers/momo.provider.js'

@Module({
	imports: [PrismaModule, NotificationModule],
	controllers: [PaymentController],
	providers: [PaymentService, VNPayProvider, MoMoProvider],
	exports: [PaymentService],
})
export class PaymentModule {}
