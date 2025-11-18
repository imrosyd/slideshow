/*
  Warnings:

  - You are about to drop the column `email` on the `active_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `login_attempts` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `profiles` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[username]` on the table `profiles` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `username` to the `profiles` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "profiles_email_idx";

-- DropIndex
DROP INDEX "profiles_email_key";

-- AlterTable
ALTER TABLE "active_sessions" DROP COLUMN "email";

-- AlterTable
ALTER TABLE "login_attempts" DROP COLUMN "email";

-- AlterTable
ALTER TABLE "profiles" DROP COLUMN "email",
ADD COLUMN     "username" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "profiles_username_key" ON "profiles"("username");

-- CreateIndex
CREATE INDEX "profiles_username_idx" ON "profiles"("username");
