import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/users/schema/user.schema';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]), // Inject User schema vào module
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
