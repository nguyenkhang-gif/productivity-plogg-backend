import { UserRole } from 'src/shared/security/user-role.enum';
import { ChangeUserRoleUseCase } from './change-user-role.use-case';

describe('ChangeUserRoleUseCase', () => {
  it('revokes all sessions of the target user after changing the role', async () => {
    const repo = {
      findById: jest.fn(async () => ({ id: 'u2' })),
      update: jest.fn(async () => ({ id: 'u2', role: UserRole.User })),
    };
    const tokens = { revokeAllSessions: jest.fn(async () => undefined) };
    const useCase = new ChangeUserRoleUseCase(repo as any, tokens as any);

    await useCase.execute('u2', UserRole.User, 'admin1');

    expect(tokens.revokeAllSessions).toHaveBeenCalledWith('u2');
  });
});
