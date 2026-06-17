import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../databases/schemas/user.schema';
import { Friendship, FriendshipSchema } from '../databases/schemas/friendship.schema';
import { Post, PostSchema } from '../databases/schemas/post.schema';
import { POST_REPOSITORY } from 'src/core/domain/repositories/post.repository.interface';
import { MongoPostRepository } from '../databases/repositories/post.repository';
import { AuthController } from 'src/presentation/controllers/auth.controller';
import { USER_REPOSITORY } from 'src/core/domain/repositories/user.repository.interface';
import { MongoUserRepository } from '../databases/repositories/user.repository';
import { ValidateUserUseCase } from 'src/use-case/auth/validate-user.use-case';
import { LoginUseCase } from 'src/use-case/auth/login.use-case';
import { LogoutUseCase } from 'src/use-case/auth/logout.use-case';
import { RefreshTokenUseCase } from 'src/use-case/auth/refresh-token.use-case';
import { RegisterUseCase } from 'src/use-case/auth/register.use-case';
import { ProfileUseCase } from 'src/use-case/auth/profile.use-case';
import { UpdateProfileUseCase } from 'src/use-case/auth/update-profile.use-case';
import { ListSessionsUseCase } from 'src/use-case/auth/list-sessions.use-case';
import { RevokeSessionUseCase } from 'src/use-case/auth/revoke-session.use-case';
import { SearchUsersUseCase } from 'src/use-case/auth/search-users.use-case';
import { GetUserProfileUseCase } from 'src/use-case/auth/get-user-profile.use-case';
import { UserController } from 'src/presentation/controllers/user.controller';
import { LocalStrategy } from './strategies/local.stradegy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { GoogleAuthUseCase } from 'src/use-case/auth/google-auth.use-case';
import { GetSuggestionsUseCase } from 'src/use-case/user/get-suggestions.use-case';
import { TokenService } from './token/token.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Friendship.name, schema: FriendshipSchema },
      { name: Post.name, schema: PostSchema },
    ]),
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET_KEY')?.trim() || 'defaultSecret';
        let expiresIn = configService.get<string>('JWT_EXPIRATION_TIME') || '900s';

        if (/^\d+$/.test(expiresIn)) {
          expiresIn = `${expiresIn}s`;
        }

        return {
          secret,
          signOptions: { expiresIn: expiresIn as any },
        };
      },
    }),
  ],
  controllers: [AuthController, UserController],
  providers: [
    {
      provide: USER_REPOSITORY,
      useClass: MongoUserRepository,
    },
    {
      provide: POST_REPOSITORY,
      useClass: MongoPostRepository,
    },
    TokenService,
    ValidateUserUseCase,
    LoginUseCase,
    ListSessionsUseCase,
    RevokeSessionUseCase,
    LogoutUseCase,
    RefreshTokenUseCase,
    RegisterUseCase,
    ProfileUseCase,
    UpdateProfileUseCase,
    SearchUsersUseCase,
    GetUserProfileUseCase,
    LocalStrategy,
    JwtStrategy,
    GoogleStrategy,
    GoogleAuthUseCase,
    GetSuggestionsUseCase,
  ],
})
export class AuthModule {}
