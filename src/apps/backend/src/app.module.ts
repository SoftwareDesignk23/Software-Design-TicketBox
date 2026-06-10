import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { AppController } from './app.controller.js'
import { AppService } from './app.service.js'
import { AuthModule } from './auth/auth.module.js'
import { authConfig, authEnvSchema } from './auth/auth.config.js'
import { ConcertsModule } from './concerts/concerts.module.js'
import { BookingModule } from './bookings/booking.module.js'
import { PaymentModule } from './payments/payment.module.js'
import { NotificationModule } from './notifications/notification.module.js'
import { CheckinModule } from './checkin/checkin.module.js'
import { CsvModule } from './csv/csv.module.js'
import { AiModule } from './ai/ai.module.js'
import { StorageModule } from './storage/storage.module.js'
import { TicketsModule } from './tickets/tickets.module.js'
import { AdminModule } from './admin/admin.module.js'
import { HttpResponseInterceptor } from './common/interceptors/http-response.interceptor.js'
import { RedisModule } from './redis/redis.module.js'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { RabbitMQModule } from './rabbitmq/rabbitmq.module.js'
import { ScheduleModule } from '@nestjs/schedule'

import { AppThrottlerGuard } from './common/guards/app-throttler.guard.js'

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			load: [authConfig],
			validate: (config) => authEnvSchema.parse(config),
		}),
		ThrottlerModule.forRoot([
			{
				ttl: 60000,
				limit: 100, // 100 requests per minute
			},
		]),
		ScheduleModule.forRoot(),
		RedisModule,
		RabbitMQModule,
		AuthModule,
		ConcertsModule,
		BookingModule,
		PaymentModule,
		NotificationModule,
		CheckinModule,
		CsvModule,
		AiModule,
		StorageModule,
		TicketsModule,
		AdminModule,
	],
	controllers: [AppController],
	providers: [
		AppService,
		{
			provide: APP_GUARD,
			useClass: AppThrottlerGuard,
		},
		{
			provide: APP_INTERCEPTOR,
			useClass: HttpResponseInterceptor,
		},
	],
})
export class AppModule {}

