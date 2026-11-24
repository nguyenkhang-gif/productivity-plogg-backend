import { Message } from 'src/modules/community/message/domain/message.entity';

export class MessageCreated {
  static readonly eventName = 'community.message.created';
  constructor(
    readonly guildId: string,
    readonly channelId: string,
    readonly message: Message,
  ) {}
}

export class MessageEdited {
  static readonly eventName = 'community.message.edited';
  constructor(
    readonly guildId: string,
    readonly channelId: string,
    readonly messageId: string,
    readonly content: string,
    readonly editedAt: Date | null | undefined,
  ) {}
}

export class MessageDeleted {
  static readonly eventName = 'community.message.deleted';
  constructor(
    readonly guildId: string,
    readonly channelId: string,
    readonly messageId: string,
  ) {}
}

export class ReactionChanged {
  static readonly eventName = 'community.reaction.changed';
  constructor(
    readonly guildId: string,
    readonly channelId: string,
    readonly messageId: string,
    readonly emoji: string,
    readonly userId: string,
  ) {}
}
