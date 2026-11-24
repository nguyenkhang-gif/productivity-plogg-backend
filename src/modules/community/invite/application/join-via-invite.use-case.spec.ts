import { GoneException, NotFoundException } from '@nestjs/common';
import { JoinViaInviteUseCase } from './join-via-invite.use-case';

describe('JoinViaInviteUseCase', () => {
  const inviteRepo = { findByCode: jest.fn(), joinWithInvite: jest.fn() };
  const memberRepo = { isMember: jest.fn() };
  const roleRepo = { findDefaultByGuild: jest.fn() };
  const events = { publish: jest.fn() };
  const useCase = new JoinViaInviteUseCase(
    inviteRepo as any,
    memberRepo as any,
    roleRepo as any,
    events as any,
  );
  const input = { code: 'abc', userId: 'u1', username: 'user' };

  beforeEach(() => {
    jest.resetAllMocks();
    memberRepo.isMember.mockResolvedValue(false);
    roleRepo.findDefaultByGuild.mockResolvedValue({ id: 'everyone' });
    inviteRepo.joinWithInvite.mockResolvedValue('joined');
  });

  it('404s on unknown code', async () => {
    inviteRepo.findByCode.mockResolvedValue(null);
    await expect(useCase.execute(input)).rejects.toThrow(NotFoundException);
  });

  it('rejects expired invites', async () => {
    inviteRepo.findByCode.mockResolvedValue({
      guildId: 'g1',
      uses: 0,
      maxUses: null,
      expiresAt: new Date(Date.now() - 1000),
    });
    await expect(useCase.execute(input)).rejects.toThrow(GoneException);
    expect(inviteRepo.joinWithInvite).not.toHaveBeenCalled();
  });

  it('rejects exhausted invites', async () => {
    inviteRepo.findByCode.mockResolvedValue({
      guildId: 'g1',
      uses: 3,
      maxUses: 3,
      expiresAt: null,
    });
    await expect(useCase.execute(input)).rejects.toThrow(GoneException);
  });

  it('rejects when the atomic update loses the race', async () => {
    inviteRepo.findByCode.mockResolvedValue({
      guildId: 'g1',
      uses: 2,
      maxUses: 3,
      expiresAt: null,
    });
    inviteRepo.joinWithInvite.mockResolvedValue('unavailable');
    await expect(useCase.execute(input)).rejects.toThrow(GoneException);
  });

  it('joins with the default role through the atomic repository call', async () => {
    inviteRepo.findByCode.mockResolvedValue({
      guildId: 'g1',
      uses: 0,
      maxUses: 3,
      expiresAt: null,
    });
    await expect(useCase.execute(input)).resolves.toEqual({ guildId: 'g1' });
    expect(inviteRepo.joinWithInvite).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'abc',
        guildId: 'g1',
        defaultRoleId: 'everyone',
      }),
    );
  });

  it('is idempotent for existing members', async () => {
    inviteRepo.findByCode.mockResolvedValue({
      guildId: 'g1',
      uses: 3,
      maxUses: 3,
    });
    memberRepo.isMember.mockResolvedValue(true);
    await expect(useCase.execute(input)).resolves.toEqual({ guildId: 'g1' });
    expect(inviteRepo.joinWithInvite).not.toHaveBeenCalled();
  });
});
