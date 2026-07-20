export type GuildRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export class Role {
  id: string;
  guildId: string;
  name: string;
  color: string;
  position: number;
  permissions: bigint; // bitmask, vd: 1n<<1n | 1n<<2n = quyền SEND_MESSAGES + MANAGE_MESSAGES
  isDefault: boolean;

  constructor(partial: Partial<Role>) {
    Object.assign(this, partial);
  }
}
