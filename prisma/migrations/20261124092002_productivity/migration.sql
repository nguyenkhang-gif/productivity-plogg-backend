-- CreateTable
CREATE TABLE "focus_sessions_raw" (
    "id" VARCHAR(24) NOT NULL,
    "userId" VARCHAR(24) NOT NULL,
    "clientSessionId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "localDate" VARCHAR(10) NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "xpEarned" INTEGER NOT NULL,

    CONSTRAINT "focus_sessions_raw_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "focus_rollups_daily" (
    "userId" VARCHAR(24) NOT NULL,
    "date" VARCHAR(10) NOT NULL,
    "sessionsCount" INTEGER NOT NULL,
    "totalFocusMin" INTEGER NOT NULL,
    "totalXp" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "focus_rollups_daily_pkey" PRIMARY KEY ("userId","date")
);

-- CreateTable
CREATE TABLE "focus_rollups_weekly" (
    "userId" VARCHAR(24) NOT NULL,
    "weekStart" VARCHAR(10) NOT NULL,
    "sessionsCount" INTEGER NOT NULL,
    "totalFocusMin" INTEGER NOT NULL,
    "totalXp" INTEGER NOT NULL,

    CONSTRAINT "focus_rollups_weekly_pkey" PRIMARY KEY ("userId","weekStart")
);

-- CreateTable
CREATE TABLE "focus_rollups_monthly" (
    "userId" VARCHAR(24) NOT NULL,
    "month" VARCHAR(7) NOT NULL,
    "sessionsCount" INTEGER NOT NULL,
    "totalFocusMin" INTEGER NOT NULL,
    "totalXp" INTEGER NOT NULL,

    CONSTRAINT "focus_rollups_monthly_pkey" PRIMARY KEY ("userId","month")
);

-- CreateTable
CREATE TABLE "user_progress" (
    "id" VARCHAR(24) NOT NULL,
    "userId" VARCHAR(24) NOT NULL,
    "totalXp" INTEGER NOT NULL DEFAULT 0,
    "totalFocusMin" INTEGER NOT NULL DEFAULT 0,
    "drinkId" TEXT,
    "tzOffset" INTEGER NOT NULL DEFAULT 0,
    "todayCount" INTEGER NOT NULL DEFAULT 0,
    "todayFocusMin" INTEGER NOT NULL DEFAULT 0,
    "lastActiveLocalDate" VARCHAR(10),
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "encrypted_vaults" (
    "id" VARCHAR(24) NOT NULL,
    "userId" VARCHAR(24) NOT NULL,
    "scope" TEXT NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "wrappedKey" TEXT NOT NULL,
    "kdf" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "encrypted_vaults_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "focus_sessions_raw_userId_localDate_idx" ON "focus_sessions_raw"("userId", "localDate");

-- CreateIndex
CREATE INDEX "focus_sessions_raw_localDate_idx" ON "focus_sessions_raw"("localDate");

-- CreateIndex
CREATE INDEX "focus_sessions_raw_completedAt_idx" ON "focus_sessions_raw"("completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "focus_sessions_raw_userId_clientSessionId_key" ON "focus_sessions_raw"("userId", "clientSessionId");

-- CreateIndex
CREATE INDEX "focus_rollups_daily_date_idx" ON "focus_rollups_daily"("date");

-- CreateIndex
CREATE INDEX "focus_rollups_daily_createdAt_idx" ON "focus_rollups_daily"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_progress_userId_key" ON "user_progress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "encrypted_vaults_userId_scope_key" ON "encrypted_vaults"("userId", "scope");

-- AddForeignKey
ALTER TABLE "focus_sessions_raw" ADD CONSTRAINT "focus_sessions_raw_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "focus_rollups_daily" ADD CONSTRAINT "focus_rollups_daily_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "focus_rollups_weekly" ADD CONSTRAINT "focus_rollups_weekly_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "focus_rollups_monthly" ADD CONSTRAINT "focus_rollups_monthly_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encrypted_vaults" ADD CONSTRAINT "encrypted_vaults_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
