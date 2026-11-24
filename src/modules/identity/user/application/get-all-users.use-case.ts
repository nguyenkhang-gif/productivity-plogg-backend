import { Inject, Injectable } from '@nestjs/common';
import {
  FindAllUsersResult,
  USER_REPOSITORY,
  UserRepository,
} from 'src/modules/identity/user/domain/user.repository.interface';
import { AdminUserQueryDto } from 'src/modules/identity/user/application/dto/admin-user-query.dto';

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
