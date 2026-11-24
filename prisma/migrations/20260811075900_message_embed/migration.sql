-- CreateTable
CREATE TABLE "message_embeds" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "refId" TEXT,
    "title" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "siteName" TEXT,
    "authorName" TEXT,
    "embedUrl" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_embeds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "message_embeds_messageId_idx" ON "message_embeds"("messageId");

-- CreateIndex
CREATE INDEX "message_embeds_provider_refId_idx" ON "message_embeds"("provider", "refId");

-- AddForeignKey
ALTER TABLE "message_embeds" ADD CONSTRAINT "message_embeds_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
