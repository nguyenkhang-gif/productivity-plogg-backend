export class GuildMember {
  guildId: string;
  userId: string;
  username: string;
  avatar?: string | null;
  nickname?: string | null;
  joinedAt?: Date;

  /** Id các role user có trong guild. FE lấy định nghĩa role từ GET /roles (tránh lặp full object mỗi member). */
  roleIds?: string[];

  constructor(partial: Partial<GuildMember>) {
    Object.assign(this, partial);
  }
}
