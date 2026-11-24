export class MemberJoined {
  static readonly eventName = 'community.member.joined';
  constructor(
    readonly guildId: string,
    readonly userId: string,
    readonly username: string,
    readonly avatar: string | null,
  ) {}
}

export class MemberLeft {
  static readonly eventName = 'community.member.left';
  constructor(
    readonly guildId: string,
    readonly userId: string,
  ) {}
}

export class MemberKicked {
  static readonly eventName = 'community.member.kicked';
  constructor(
    readonly guildId: string,
    readonly userId: string,
    readonly actorId: string,
  ) {}
}

export class MemberRolesChanged {
  static readonly eventName = 'community.member.roles-changed';
  constructor(
    readonly guildId: string,
    readonly userId: string,
    readonly roleId: string,
    readonly action: 'assigned' | 'removed',
  ) {}
}
