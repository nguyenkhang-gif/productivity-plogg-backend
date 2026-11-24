-- CreateTable
CREATE TABLE "guild_invites" (
    "code" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "maxUses" INTEGER,
    "uses" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guild_invites_pkey" PRIMARY KEY ("code")
);

-- CreateIndex
CREATE INDEX "guild_invites_guildId_idx" ON "guild_invites"("guildId");

-- AddForeignKey
ALTER TABLE "guild_invites" ADD CONSTRAINT "guild_invites_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
