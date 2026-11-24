-- CreateIndex
CREATE INDEX "guild_members_guildId_joinedAt_userId_idx" ON "guild_members"("guildId", "joinedAt", "userId");
