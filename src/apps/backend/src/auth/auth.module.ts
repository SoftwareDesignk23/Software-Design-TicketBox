import { Module } from '@nestjs/common'
import { PassportModule } from '@nestjs/passport'
import { AuthController } from './auth.controller.js'
import { AuthService } from './auth.service.js'
import { AuthStore } from './auth.store.js'
import { AuthTokenService } from './auth.tokens.js'
import { DemoController } from './demo.controller.js'
import { PrismaModule } from '../prisma/prisma.module.js'
import { JwtStrategy } from './jwt.strategy.js'

@Module({
	imports: [PrismaModule, PassportModule.register({ defaultStrategy: 'jwt' })],
	controllers: [AuthController, DemoController],
	providers: [AuthService, AuthStore, AuthTokenService, JwtStrategy],
	exports: [AuthService, AuthStore, AuthTokenService],
})
export class AuthModule {}
