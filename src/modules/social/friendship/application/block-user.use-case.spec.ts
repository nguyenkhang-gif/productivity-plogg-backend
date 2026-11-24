import { ForbiddenException } from '@nestjs/common';
import { Friendship } from 'src/modules/social/friendship/domain/friendship.entity';
import { BlockUserUseCase } from './block-user.use-case';

describe('BlockUserUseCase', () => {
  const makeRepo = (existing: Friendship | null) => ({
    findByPair: jest.fn().mockResolvedValue(existing),
    create: jest.fn(async (f: Friendship) => f),
    delete: jest.fn(),
    updateStatus: jest.fn(),
  });

  it('does not let the blocked user undo a block by blocking back', async () => {
    const repo = makeRepo(
      new Friendship({
        id: 'f1',
        userId: 'a',
        friendId: 'b',
        status: 'blocked',
      }),
    );
    const useCase = new BlockUserUseCase(repo as any);

    await expect(useCase.execute('b', 'a')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(repo.delete).not.toHaveBeenCalled();
    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.updateStatus).not.toHaveBeenCalled();
  });

  it('still lets a user block someone who sent them a request', async () => {
    const repo = makeRepo(
      new Friendship({
        id: 'f1',
        userId: 'a',
        friendId: 'b',
        status: 'pending',
      }),
    );
    const useCase = new BlockUserUseCase(repo as any);

    const result = await useCase.execute('b', 'a');
    expect(repo.delete).toHaveBeenCalledWith('f1');
    expect(result.userId).toBe('b');
    expect(result.status).toBe('blocked');
  });
});
