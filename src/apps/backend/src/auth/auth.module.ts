import { Module } from '@nestjs/common'
import { AuthController } from './auth.controller.js'
import { AuthService } from './auth.service.js'
import { AuthStore } from './auth.store.js'
import { AuthTokenService } from './auth.tokens.js'
import { DemoController } from './demo.controller.js'
import { PrismaModule } from '../prisma/prisma.module.js'

@Module({
	imports: [PrismaModule],
	controllers: [AuthController, DemoController],
	providers: [AuthService, AuthStore, AuthTokenService],
	exports: [AuthService, AuthTokenService],
})
export class AuthModule {}
