/*
  Warnings:

  - Added the required column `encryptedVaultKey` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `kdfSalt` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `publicKey` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "encryptedVaultKey" TEXT NOT NULL,
ADD COLUMN     "kdfSalt" TEXT NOT NULL,
ADD COLUMN     "publicKey" TEXT NOT NULL;
