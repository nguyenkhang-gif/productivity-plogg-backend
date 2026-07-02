import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  USER_REPOSITORY,
  UserRepository,
} from 'src/core/domain/repositories/user.repository.interface';
import { UserRole } from 'src/core/domain/enums/user-role.enum';
import { User } from 'src/core/domain/entities/user.entity';

@Injectable()
export class ChangeUserRoleUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepository,
  ) {}

  async execute(
    targetUserId: string,
    role: UserRole,
    requesterId: string,
  ): Promise<Omit<User, 'passwordHash'>> {
    if (!Object.values(UserRole).includes(role)) {
      throw new BadRequestException('Invalid role');
    }
    // Prevent an admin from changing their own role (avoid accidental self-lockout).
    if (targetUserId === requesterId) {
      throw new ForbiddenException('You cannot change your own role');
    }

    const target = await this.userRepo.findById(targetUserId);
    if (!target) throw new NotFoundException('User not found');

    const updated = await this.userRepo.update(targetUserId, { role });
    const { passwordHash: _passwordHash, ...safe } = updated;
    return safe;
  }
}
