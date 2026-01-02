/*
  Warnings:

  - Changed the type of `action` on the `AuditLog` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('SUBMIT', 'APPROVE', 'REJECT', 'LOGIN');

-- AlterTable
ALTER TABLE "AuditLog" DROP COLUMN "action",
ADD COLUMN     "action" "AuditAction" NOT NULL;
