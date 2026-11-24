import { GuildPermissions } from 'src/modules/community/guild/domain/guild-permissions';
import { MessageCreated } from 'src/modules/community/message/domain/events/message.events';
import { SendMessageUseCase } from './send-message.use-case';

describe('SendMessageUseCase', () => {
  const messageRepo = { create: jest.fn(), findById: jest.fn() };
  const channelRepo = { findById: jest.fn() };
  const memberRepo = {
    getResolvedPermissions: jest.fn(),
    findMember: jest.fn(),
  };
  const events = { publish: jest.fn() };
  const useCase = new SendMessageUseCase(
    messageRepo as any,
    channelRepo as any,
    memberRepo as any,
    events as any,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    channelRepo.findById.mockResolvedValue({ id: 'c1', guildId: 'g1' });
    memberRepo.getResolvedPermissions.mockResolvedValue(
      GuildPermissions.SEND_MESSAGES,
    );
    memberRepo.findMember.mockResolvedValue({ username: 'alice' });
  });

  it('publishes MessageCreated with the persisted channelId and guildId', async () => {
    const persisted = { id: 'm1', channelId: 'c1', content: 'hi' };
    messageRepo.create.mockResolvedValue(persisted);

    const result = await useCase.execute({
      channelId: 'c1',
      senderId: 'u1',
      senderName: 'x',
      content: 'hi',
    });

    expect(result).toBe(persisted);
    expect(events.publish).toHaveBeenCalledTimes(1);
    expect(events.publish).toHaveBeenCalledWith(
      new MessageCreated('g1', 'c1', persisted as any),
    );
  });

  it('does not publish when permission is missing', async () => {
    memberRepo.getResolvedPermissions.mockResolvedValue(0n);

    await expect(
      useCase.execute({
        channelId: 'c1',
        senderId: 'u1',
        senderName: 'x',
        content: 'hi',
      }),
    ).rejects.toThrow();
    expect(events.publish).not.toHaveBeenCalled();
  });
});
