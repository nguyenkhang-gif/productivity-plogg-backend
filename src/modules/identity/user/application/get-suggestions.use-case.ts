import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY,
  UserRepository,
} from 'src/modules/identity/user/domain/user.repository.interface';
import { User } from 'src/modules/identity/user/domain/user.entity';

@Injectable()
export class GetSuggestionsUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepository,
  ) {}

  async execute(currentUserId: string, limit: number): Promise<User[]> {
    return this.userRepo.findSuggestions(currentUserId, limit);
  }
}
