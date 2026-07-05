import { Inject, Injectable } from '@nestjs/common';
import {
  FindAllUsersResult,
  USER_REPOSITORY,
  UserRepository,
} from 'src/core/domain/repositories/user.repository.interface';
import { AdminUserQueryDto } from 'src/core/dtos/admin-user-query.dto';

@Injectable()
export class GetAllUsersUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepository,
  ) {}

  async execute(query: AdminUserQueryDto): Promise<FindAllUsersResult> {
    return this.userRepo.findAll({
      search: query.search,
      role: query.role,
      membership: query.membership,
      page: query.page,
      limit: query.limit,
    });
  }
}
