import { UserRole } from '../enums/user-role.enum';

export class User {
  id: string;
  fullName: string;
  username: string;
  email: string;
  passwordHash: string;
  gender: string;
  profilePic?: string;
  membership?: string;
  role?: UserRole;
  isPrivate?: boolean;
  resetPasswordToken?: string;
  googleId?: string;
  facebookId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  /** Attached by admin list queries only. */
  postCount?: number;

  constructor(partial: Partial<User>) {
    Object.assign(this, partial);
  }
}
