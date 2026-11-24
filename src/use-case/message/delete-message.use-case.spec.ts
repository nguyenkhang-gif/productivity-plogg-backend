import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { GuildPermissions } from 'src/core/domain/constants/guild-permissions';
import { DeleteMessageUseCase } from './delete-message.use-case';

describe('DeleteMessageUseCase', () => {
  const messageRepo = {
    findById: jest.fn(),
    softDelete: jest.fn(),
  };
  const channelRepo = { findById: jest.fn() };
  const memberRepo = { getResolvedPermissions: jest.fn() };
  const useCase = new DeleteMessageUseCase(
    messageRepo as any,
    channelRepo as any,
    memberRepo as any,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    messageRepo.softDelete.mockResolvedValue(true);
  });

  it('rejects when the message does not belong to the supplied channel', async () => {
    messageRepo.findById.mockResolvedValue({
      id: 'm1',
      channelId: 'victim-channel',
    });

    await expect(useCase.execute('m1', 'my-channel', 'u1')).rejects.toThrow(
      NotFoundException,
    );
    expect(memberRepo.getResolvedPermissions).not.toHaveBeenCalled();
    expect(messageRepo.softDelete).not.toHaveBeenCalled();
  });

  it('rejects when the message does not exist', async () => {
    messageRepo.findById.mockResolvedValue(null);
    await expect(useCase.execute('m1', 'c1', 'u1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('checks permission against the message channel guild and scopes the delete', async () => {
    messageRepo.findById.mockResolvedValue({ id: 'm1', channelId: 'c1' });
    channelRepo.findById.mockResolvedValue({ id: 'c1', guildId: 'g1' });
    memberRepo.getResolvedPermissions.mockResolvedValue(
      GuildPermissions.VIEW_CHANNELS,
    );

    const result = await useCase.execute('m1', 'c1', 'u1');

    expect(channelRepo.findById).toHaveBeenCalledWith('c1');
    expect(memberRepo.getResolvedPermissions).toHaveBeenCalledWith('g1', 'u1');
    expect(messageRepo.softDelete).toHaveBeenCalledWith('m1', 'c1', 'u1');
    expect(result).toEqual({ channelId: 'c1' });
  });

  it('lets MANAGE_MESSAGES delete any message in the channel', async () => {
    messageRepo.findById.mockResolvedValue({ id: 'm1', channelId: 'c1' });
    channelRepo.findById.mockResolvedValue({ id: 'c1', guildId: 'g1' });
    memberRepo.getResolvedPermissions.mockResolvedValue(
      GuildPermissions.VIEW_CHANNELS | GuildPermissions.MANAGE_MESSAGES,
    );

    await useCase.execute('m1', 'c1', 'u1');

    expect(messageRepo.softDelete).toHaveBeenCalledWith('m1', 'c1', undefined);
  });

  it('rejects non-members', async () => {
    messageRepo.findById.mockResolvedValue({ id: 'm1', channelId: 'c1' });
    channelRepo.findById.mockResolvedValue({ id: 'c1', guildId: 'g1' });
    memberRepo.getResolvedPermissions.mockResolvedValue(0n);

    await expect(useCase.execute('m1', 'c1', 'u1')).rejects.toThrow(
      ForbiddenException,
    );
  });
});
