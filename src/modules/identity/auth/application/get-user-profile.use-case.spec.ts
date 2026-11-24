import { NotFoundException } from '@nestjs/common';
import { GetUserProfileUseCase } from './get-user-profile.use-case';
import { SearchUsersUseCase } from './search-users.use-case';

const rel = (partial = {}) => ({
  isSelf: false,
  isFriend: false,
  blockedByViewer: false,
  blockedViewer: false,
  ...partial,
});

describe('profile read path', () => {
  const user = {
    id: 'target',
    fullName: 'T',
    username: 't',
    isPrivate: false,
  };

  const makeProfile = (relationship: any) => {
    const userRepo = { findById: jest.fn().mockResolvedValue(user) };
    const postRepo = { countByAuthor: jest.fn().mockResolvedValue(3) };
    const cache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn(),
    };
    const relationships = {
      getRelationship: jest.fn().mockResolvedValue(relationship),
    };
    return {
      userRepo,
      relationships,
      useCase: new GetUserProfileUseCase(
        userRepo as any,
        postRepo as any,
        cache as any,
        relationships as any,
      ),
    };
  };

  it('returns the profile for strangers and friends', async () => {
    const { useCase, relationships } = makeProfile(rel());
    const result = await useCase.execute('target', 'viewer');
    expect(result.id).toBe('target');
    expect(relationships.getRelationship).toHaveBeenCalledWith(
      'viewer',
      'target',
    );
  });

  it('404s when the viewer blocked the target', async () => {
    const { useCase, userRepo } = makeProfile(rel({ blockedByViewer: true }));
    await expect(useCase.execute('target', 'viewer')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(userRepo.findById).not.toHaveBeenCalled();
  });

  it('404s when the target blocked the viewer', async () => {
    const { useCase } = makeProfile(rel({ blockedViewer: true }));
    await expect(useCase.execute('target', 'viewer')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('lets users view their own profile', async () => {
    const { useCase } = makeProfile(rel({ isSelf: true }));
    await expect(useCase.execute('target', 'target')).resolves.toBeDefined();
  });

  it('excludes blocked users from search', async () => {
    const userRepo = {
      search: jest.fn().mockResolvedValue([]),
    };
    const relationships = {
      getBlockedIds: jest.fn().mockResolvedValue(['x', 'y']),
    };
    const useCase = new SearchUsersUseCase(
      userRepo as any,
      relationships as any,
    );

    await useCase.execute(' bob ', 'viewer');

    expect(userRepo.search).toHaveBeenCalledWith('bob', 'viewer', ['x', 'y']);
  });
});
