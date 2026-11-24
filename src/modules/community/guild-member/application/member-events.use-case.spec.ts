import { ForbiddenException } from '@nestjs/common';
import { GuildPermissions } from 'src/modules/community/guild/domain/guild-permissions';
import {
  MemberKicked,
  MemberLeft,
} from 'src/modules/community/guild-member/domain/events/member.events';
import { KickMemberUseCase } from './kick-member.use-case';
import { LeaveGuildUseCase } from './leave-guild.use-case';

describe('member use-cases publish events', () => {
  const memberRepo = {
    remove: jest.fn(),
    getResolvedPermissions: jest.fn(),
    getHighestRolePosition: jest.fn(),
  };
  const guildRepo = { findById: jest.fn() };
  const events = { publish: jest.fn() };
  const kick = new KickMemberUseCase(
    memberRepo as any,
    guildRepo as any,
    events as any,
  );
  const leave = new LeaveGuildUseCase(
    memberRepo as any,
    guildRepo as any,
    events as any,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    guildRepo.findById.mockResolvedValue({ id: 'g1', ownerId: 'owner' });
  });

  it('kick publishes MemberKicked after removal', async () => {
    memberRepo.getResolvedPermissions.mockResolvedValue(
      GuildPermissions.KICK_MEMBERS,
    );
    memberRepo.getHighestRolePosition
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(1);

    await kick.execute('g1', 'actor', 'target');

    expect(memberRepo.remove).toHaveBeenCalledWith('g1', 'target');
    expect(events.publish).toHaveBeenCalledWith(
      new MemberKicked('g1', 'target', 'actor'),
    );
  });

  it('kick publishes nothing when forbidden', async () => {
    memberRepo.getResolvedPermissions.mockResolvedValue(0n);
    await expect(kick.execute('g1', 'actor', 'target')).rejects.toThrow(
      ForbiddenException,
    );
    expect(events.publish).not.toHaveBeenCalled();
  });

  it('leave publishes MemberLeft', async () => {
    await leave.execute('g1', 'u1');
    expect(events.publish).toHaveBeenCalledWith(new MemberLeft('g1', 'u1'));
  });
});
