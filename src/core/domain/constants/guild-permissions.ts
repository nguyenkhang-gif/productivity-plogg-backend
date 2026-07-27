export const GuildPermissions = {
  VIEW_CHANNELS: 1n << 0n,
  SEND_MESSAGES: 1n << 1n,
  MANAGE_MESSAGES: 1n << 2n, // xóa tin của người khác
  MANAGE_CHANNELS: 1n << 3n,
  MANAGE_GUILD: 1n << 4n,
  KICK_MEMBERS: 1n << 5n,
  BAN_MEMBERS: 1n << 6n,
  MANAGE_ROLES: 1n << 7n,
  ADMINISTRATOR: 1n << 8n, // bypass tất cả checks
} as const;

export function hasPermission(perms: bigint, required: bigint): boolean {
  return !!(perms & GuildPermissions.ADMINISTRATOR) || !!(perms & required);
}
