/*
  Warnings:

  - You are about to drop the `EventAssignment` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ConcertStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "EventAssignment" DROP CONSTRAINT "EventAssignment_userId_fkey";

-- DropTable
DROP TABLE "EventAssignment";

-- CreateTable
CREATE TABLE "ConcertAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "concertId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConcertAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Concert" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "venueName" TEXT NOT NULL,
    "venueAddress" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "salesOpensAt" TIMESTAMP(3),
    "status" "ConcertStatus" NOT NULL DEFAULT 'DRAFT',
    "heroImageUrl" TEXT,
    "organizerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Concert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConcertAssignment_concertId_idx" ON "ConcertAssignment"("concertId");

-- CreateIndex
CREATE UNIQUE INDEX "ConcertAssignment_userId_role_concertId_key" ON "ConcertAssignment"("userId", "role", "concertId");

-- CreateIndex
CREATE INDEX "Concert_organizerId_idx" ON "Concert"("organizerId");

-- CreateIndex
CREATE INDEX "Concert_status_startsAt_idx" ON "Concert"("status", "startsAt");

-- AddForeignKey
ALTER TABLE "ConcertAssignment" ADD CONSTRAINT "ConcertAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConcertAssignment" ADD CONSTRAINT "ConcertAssignment_concertId_fkey" FOREIGN KEY ("concertId") REFERENCES "Concert"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Concert" ADD CONSTRAINT "Concert_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
