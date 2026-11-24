export { AuthModule } from './identity.module';
export { TokenService } from './auth/infrastructure/token/token.service';
export {
  User,
  UserSchema,
  type UserDocument,
} from './user/infrastructure/user.schema';
export { LastSeenMiddleware } from './user/presentation/last-seen.middleware';
