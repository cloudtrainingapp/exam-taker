/*
  Warnings:

  - You are about to drop the column `slug` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the `TenantSettings` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[slug]` on the table `Attempt` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenantId,slug]` on the table `Quiz` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[subdomain]` on the table `Tenant` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[customDomain]` on the table `Tenant` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `Attempt` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slug` to the `Quiz` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subdomain` to the `Tenant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userType` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('SUPERADMIN', 'ADMIN', 'USER');

-- DropForeignKey
ALTER TABLE "TenantSettings" DROP CONSTRAINT "TenantSettings_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_tenantId_fkey";

-- DropIndex
DROP INDEX "Tenant_slug_key";

-- DropIndex
DROP INDEX "User_email_tenantId_key";

-- AlterTable
ALTER TABLE "Attempt" ADD COLUMN     "slug" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN     "slug" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Tenant" DROP COLUMN "slug",
ADD COLUMN     "customDomain" TEXT,
ADD COLUMN     "emailSubject" TEXT,
ADD COLUMN     "emailTemplate" TEXT,
ADD COLUMN     "isDomainVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sendEmailToggle" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "subdomain" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "userType" "UserType" NOT NULL,
ALTER COLUMN "tenantId" DROP NOT NULL;

-- DropTable
DROP TABLE "TenantSettings";

-- CreateIndex
CREATE UNIQUE INDEX "Attempt_slug_key" ON "Attempt"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Quiz_tenantId_slug_key" ON "Quiz"("tenantId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_subdomain_key" ON "Tenant"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_customDomain_key" ON "Tenant"("customDomain");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
