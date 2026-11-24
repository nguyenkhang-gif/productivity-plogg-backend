
import { ChannelDeleted } from 'src/modules/community/channel/domain/events/channel.events';
import {
  MemberKicked,
  MemberRolesChanged,
} from 'src/modules/community/guild-member/domain/events/member.events';
import { GuildPermissions } from 'src/modules/community/guild/domain/guild-permissions';
import {
  MessageCreated,
  MessageDeleted,
  MessageEdited,
  ReactionChanged,
} from 'src/modules/community/message/domain/events/message.events';
import { GuildRealtimeListener } from './guild-realtime.listener';
import { GuildRealtimeService } from './guild-realtime.service';

describe('GuildRealtimeListener', () => {
  const emit = jest.fn();
  const socketsLeave = jest.fn();
  const fetchSockets = jest.fn();
  const server = {
    to: jest.fn(() => ({ emit })),
    in: jest.fn(() => ({ socketsLeave, fetchSockets })),
  };
  const realtime = new GuildRealtimeService();
  realtime.setServer(server as any);
  const channelRepo = { findByGuild: jest.fn() };
  const memberRepo = { getResolvedPermissions: jest.fn() };
  const listener = new GuildRealtimeListener(
    realtime,
    channelRepo as any,
    memberRepo as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    channelRepo.findByGuild.mockResolvedValue([{ id: 'c1' }, { id: 'c2' }]);
  });

  it('maps message events to channel rooms with the existing payloads', () => {
    const message = { id: 'm1', channelId: 'c1' } as any;
    listener.onMessageCreated(new MessageCreated('g1', 'c1', message));
    expect(server.to).toHaveBeenLastCalledWith('channel:c1');
    expect(emit).toHaveBeenLastCalledWith('new_message', message);

    const editedAt = new Date();
    listener.onMessageEdited(
      new MessageEdited('g1', 'c1', 'm1', 'x', editedAt),
    );
    expect(emit).toHaveBeenLastCalledWith('message_edited', {
      messageId: 'm1',
      content: 'x',
      editedAt,
    });

    listener.onMessageDeleted(new MessageDeleted('g1', 'c1', 'm1'));
    expect(emit).toHaveBeenLastCalledWith('message_deleted', {
      messageId: 'm1',
    });

    listener.onReactionChanged(
      new ReactionChanged('g1', 'c1', 'm1', 'x', 'u1'),
    );
    expect(server.to).toHaveBeenLastCalledWith('channel:c1');
    expect(emit).toHaveBeenLastCalledWith('reaction_updated', {
      messageId: 'm1',
      emoji: 'x',
      userId: 'u1',
    });
  });

  it('evicts a kicked user from the guild and all its channel rooms', async () => {
    await listener.onMemberKicked(new MemberKicked('g1', 'u9', 'actor'));

    expect(server.to).toHaveBeenCalledWith('guild:g1');
    expect(emit).toHaveBeenCalledWith('member_kicked', {
      guildId: 'g1',
      userId: 'u9',
    });
    expect(server.in).toHaveBeenCalledWith('user:u9');
    expect(socketsLeave).toHaveBeenCalledWith([
      'guild:g1',
      'channel:c1',
      'channel:c2',
    ]);
  });

  it('makes sockets leave channels when VIEW_CHANNELS is lost', async () => {
    const leaveDenied = jest.fn();
    fetchSockets.mockImplementation(async () => [
      { data: { userId: 'u1' }, leave: leaveDenied },
    ]);
    memberRepo.getResolvedPermissions.mockResolvedValue(
      GuildPermissions.SEND_MESSAGES,
    );

    await listener.onMemberRolesChanged(
      new MemberRolesChanged('g1', 'u1', 'r1', 'removed'),
    );

    expect(leaveDenied).toHaveBeenCalledWith('channel:c1');
    expect(leaveDenied).toHaveBeenCalledWith('channel:c2');
  });

  it('keeps sockets that can still view channels', async () => {
    const leave = jest.fn();
    fetchSockets.mockResolvedValue([{ data: { userId: 'u1' }, leave }]);
    memberRepo.getResolvedPermissions.mockResolvedValue(
      GuildPermissions.VIEW_CHANNELS,
    );

    await listener.onMemberRolesChanged(
      new MemberRolesChanged('g1', 'u1', 'r1', 'assigned'),
    );

    expect(leave).not.toHaveBeenCalled();
  });

  it('only rechecks the affected user on member role changes', async () => {
    const leaveOther = jest.fn();
    fetchSockets.mockResolvedValue([
      { data: { userId: 'other' }, leave: leaveOther },
    ]);
    memberRepo.getResolvedPermissions.mockResolvedValue(0n);

    await listener.onMemberRolesChanged(
      new MemberRolesChanged('g1', 'u1', 'r1', 'removed'),
    );

    expect(leaveOther).not.toHaveBeenCalled();
  });

  it('sends channel events only to members who can view channels and clears the deleted room', async () => {
    const viewerEmit = jest.fn();
    const blindEmit = jest.fn();
    fetchSockets.mockResolvedValue([
      { data: { userId: 'viewer' }, emit: viewerEmit },
      { data: { userId: 'blind' }, emit: blindEmit },
    ]);
    memberRepo.getResolvedPermissions.mockImplementation(
      async (_g: string, userId: string) =>
        userId === 'viewer' ? GuildPermissions.VIEW_CHANNELS : 0n,
    );

    await listener.onChannelDeleted(new ChannelDeleted('g1', 'c1'));

    expect(server.in).toHaveBeenCalledWith('guild:g1');
    expect(viewerEmit).toHaveBeenCalledWith('channel_deleted', {
      guildId: 'g1',
      channelId: 'c1',
    });
    expect(blindEmit).not.toHaveBeenCalled();
    expect(server.in).toHaveBeenCalledWith('channel:c1');
    expect(socketsLeave).toHaveBeenCalledWith('channel:c1');
  });
});
