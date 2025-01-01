import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/users/schema/user.schema';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { RefreshTokenService } from '../refreshToken/refresh-token.service';
import {
  RefreshToken,
  RefreshTokenSchema,
} from '../refreshToken/refresh-token.schema';
import { MailService } from 'src/mail/mail.service';
@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]), // Inject User schema vào module
    MongooseModule.forFeature([
      { name: RefreshToken.name, schema: RefreshTokenSchema },
    ]), // Inject User schema vào module
  ],
  controllers: [AuthController],
  providers: [AuthService, RefreshTokenService, MailService],
})
export class AuthModule {}
