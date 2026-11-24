-- CreateEnum
CREATE TYPE "user_gender" AS ENUM ('male', 'female', 'other');

-- CreateEnum
CREATE TYPE "user_membership" AS ENUM ('basic', 'advance', 'premium');

-- CreateEnum
CREATE TYPE "user_account_role" AS ENUM ('user', 'moderator', 'admin');

-- CreateTable
CREATE TABLE "users" (
    "id" VARCHAR(24) NOT NULL,
    "fullName" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL DEFAULT '',
    "gender" "user_gender" NOT NULL DEFAULT 'other',
    "profilePic" TEXT,
    "membership" "user_membership" NOT NULL DEFAULT 'basic',
    "role" "user_account_role" NOT NULL DEFAULT 'user',
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "resetPasswordToken" TEXT,
    "googleId" TEXT,
    "facebookId" TEXT,
    "lastSeen" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "users_facebookId_key" ON "users"("facebookId");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_membership_idx" ON "users"("membership");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt" DESC);
