-- CreateEnum
CREATE TYPE "mail_log_status" AS ENUM ('sent', 'failed');

-- CreateTable
CREATE TABLE "epubs" (
    "id" VARCHAR(24) NOT NULL,
    "createdUserId" VARCHAR(24) NOT NULL,
    "sampleUrl" TEXT,
    "properties" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "epubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_contexts" (
    "id" VARCHAR(24) NOT NULL,
    "userId" VARCHAR(24) NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "setting" TEXT NOT NULL,
    "targetTone" TEXT NOT NULL,
    "sourceLanguage" TEXT NOT NULL DEFAULT 'en',
    "targetLanguage" TEXT NOT NULL DEFAULT 'vi',
    "characters" JSONB NOT NULL DEFAULT '[]',
    "glossary" JSONB NOT NULL DEFAULT '[]',
    "styleGuide" JSONB NOT NULL,
    "chapterSummaries" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "story_contexts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "translation_contexts" (
    "id" VARCHAR(24) NOT NULL,
    "userId" VARCHAR(24) NOT NULL,
    "title" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "setting" TEXT NOT NULL,
    "targetTone" TEXT NOT NULL,
    "sourceLanguage" TEXT NOT NULL DEFAULT 'en',
    "targetLanguage" TEXT NOT NULL DEFAULT 'vi',
    "characters" JSONB NOT NULL DEFAULT '[]',
    "glossary" JSONB NOT NULL DEFAULT '[]',
    "styleGuide" JSONB NOT NULL,
    "chapterSummaries" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "translation_contexts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mail_logs" (
    "id" VARCHAR(24) NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "mail_log_status" NOT NULL,
    "error" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mail_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "epubs_createdUserId_createdAt_idx" ON "epubs"("createdUserId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "story_contexts_userId_createdAt_idx" ON "story_contexts"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "translation_contexts_userId_createdAt_idx" ON "translation_contexts"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "mail_logs_sentAt_idx" ON "mail_logs"("sentAt" DESC);

-- CreateIndex
CREATE INDEX "mail_logs_to_sentAt_idx" ON "mail_logs"("to", "sentAt" DESC);

-- AddForeignKey
ALTER TABLE "epubs" ADD CONSTRAINT "epubs_createdUserId_fkey" FOREIGN KEY ("createdUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_contexts" ADD CONSTRAINT "story_contexts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translation_contexts" ADD CONSTRAINT "translation_contexts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
