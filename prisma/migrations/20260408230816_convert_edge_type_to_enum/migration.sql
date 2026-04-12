/*
  Warnings:

  - The `type` column on the `concept_edges` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "EdgeType" AS ENUM ('SEMANTIC');

-- AlterTable
ALTER TABLE "concept_edges" DROP COLUMN "type",
ADD COLUMN     "type" "EdgeType" NOT NULL DEFAULT 'SEMANTIC';
