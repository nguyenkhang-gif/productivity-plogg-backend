import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { User,UserSchema } from '../databases/schemas/user.schema';
import { AuthController } from 'src/presentation/controllers/auth.controller';
import { USER_REPOSITORY } from 'src/core/domain/repositories/user.repository.interface';
import { MongoUserRepository } from '../databases/repositories/user.repository';
import { ValidateUserUseCase } from 'src/use-case/auth/validate-user.use-case';
import { LoginUseCase } from 'src/use-case/auth/login.use-case';
import { RegisterUseCase } from 'src/use-case/auth/register.use-case';
import { ProfileUseCase } from 'src/use-case/auth/profile.use-case';
import { LocalStrategy } from './strategies/local.stradegy';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET_KEY') || 'defaultSecret',
        signOptions: { expiresIn: (configService.get<string>('JWT_EXPIRATION_TIME') || '3600s') as any },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    {
      provide: USER_REPOSITORY,
      useClass: MongoUserRepository,
    },
    ValidateUserUseCase,
    LoginUseCase,
    RegisterUseCase,
    ProfileUseCase,
    LocalStrategy,
    JwtStrategy,
  ],
})
export class AuthModule {}
