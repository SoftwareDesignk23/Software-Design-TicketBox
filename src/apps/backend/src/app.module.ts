import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { AppController } from './app.controller.js'
import { AppService } from './app.service.js'
import { AuthModule } from './auth/auth.module.js'
import { authConfig, authEnvSchema } from './auth/auth.config.js'
import { bookingConfig, bookingEnvSchema } from './booking/booking.config.js'
import { BookingModule } from './booking/booking.module.js'
import { redisConfig, redisEnvSchema } from './redis/redis.config.js'
import { RedisModule } from './redis/redis.module.js'

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			load: [authConfig, bookingConfig, redisConfig],
			validate: (config) => authEnvSchema.and(bookingEnvSchema).and(redisEnvSchema).parse(config),
		}),
		ScheduleModule.forRoot(),
		AuthModule,
		BookingModule,
		RedisModule,
	],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule {}
