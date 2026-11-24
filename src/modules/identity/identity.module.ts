import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './user/infrastructure/user.schema';
import {
  Friendship,
  FriendshipSchema,
  Post,
  PostSchema,
  POST_REPOSITORY,
  MongoPostRepository,
  FriendshipModule,
} from 'src/modules/social';
import { AuthController } from 'src/modules/identity/auth/presentation/auth.controller';
import {
  USER_REPOSITORY,
  type UserRepository,
} from 'src/modules/identity/user/domain/user.repository.interface';
import { MongoUserRepository } from './user/infrastructure/user.repository';
import { PrismaUserRepository } from './user/infrastructure/user.prisma.repository';
import { MongoUserRelations } from './user/infrastructure/user-relations.mongo';
import { USER_RELATIONS } from './user/domain/user-relations.port';
import { PrismaModule } from 'src/shared/database/prisma.module';
import { backendProvider } from 'src/shared/database/backend-provider';
import { ValidateUserUseCase } from 'src/modules/identity/auth/application/validate-user.use-case';
import { LoginUseCase } from 'src/modules/identity/auth/application/login.use-case';
import { LogoutUseCase } from 'src/modules/identity/auth/application/logout.use-case';
import { RefreshTokenUseCase } from 'src/modules/identity/auth/application/refresh-token.use-case';
import { RegisterUseCase } from 'src/modules/identity/auth/application/register.use-case';
import { ProfileUseCase } from 'src/modules/identity/auth/application/profile.use-case';
import { UpdateProfileUseCase } from 'src/modules/identity/auth/application/update-profile.use-case';
import { ListSessionsUseCase } from 'src/modules/identity/auth/application/list-sessions.use-case';
import { RevokeSessionUseCase } from 'src/modules/identity/auth/application/revoke-session.use-case';
import { SearchUsersUseCase } from 'src/modules/identity/auth/application/search-users.use-case';
import { GetUserProfileUseCase } from 'src/modules/identity/auth/application/get-user-profile.use-case';
import { UserController } from 'src/modules/identity/user/presentation/user.controller';
import { AdminUserController } from 'src/modules/identity/user/presentation/admin-user.controller';
import { GetAllUsersUseCase } from 'src/modules/identity/user/application/get-all-users.use-case';
import { LocalStrategy } from './auth/infrastructure/strategies/local.stradegy';
import { JwtStrategy } from './auth/infrastructure/strategies/jwt.strategy';
import { GoogleStrategy } from './auth/infrastructure/strategies/google.strategy';
import { GoogleAuthUseCase } from 'src/modules/identity/auth/application/google-auth.use-case';
import { GetSuggestionsUseCase } from 'src/modules/identity/user/application/get-suggestions.use-case';
import { ChangeUserRoleUseCase } from 'src/modules/identity/user/application/change-user-role.use-case';
import { TokenService } from './auth/infrastructure/token/token.service';
import { SESSION_TOKEN_PORT } from './auth/domain/session-token.port';

@Module({
  imports: [
    PrismaModule,
    FriendshipModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Friendship.name, schema: FriendshipSchema },
      { name: Post.name, schema: PostSchema },
    ]),
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET_KEY')?.trim();
        if (!secret) {
          throw new Error('JWT_SECRET_KEY is not defined');
        }
        let expiresIn =
          configService.get<string>('JWT_EXPIRATION_TIME') || '900s';

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
  controllers: [AuthController, UserController, AdminUserController],
  providers: [
    MongoUserRepository,
    PrismaUserRepository,
    { provide: USER_RELATIONS, useClass: MongoUserRelations },
    backendProvider<UserRepository>(
      USER_REPOSITORY,
      MongoUserRepository,
      PrismaUserRepository,
    ),
    {
      provide: POST_REPOSITORY,
      useClass: MongoPostRepository,
    },
    TokenService,
    { provide: SESSION_TOKEN_PORT, useExisting: TokenService },
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
    ChangeUserRoleUseCase,
    GetAllUsersUseCase,
  ],
  exports: [JwtModule, TokenService],
})
export class AuthModule {}
