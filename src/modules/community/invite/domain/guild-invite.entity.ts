export class GuildInvite {
  code: string;
  guildId: string;
  createdBy: string;
  maxUses?: number | null; // null = vô hạn (Full mới dùng)
  uses: number;
  expiresAt?: Date | null; // null = không hết hạn (Full mới dùng)
  createdAt?: Date;

  constructor(partial: Partial<GuildInvite>) {
    Object.assign(this, partial);
  }
}
