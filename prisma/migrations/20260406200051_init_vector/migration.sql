-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "ConflictType" AS ENUM ('LOGICAL');

-- CreateEnum
CREATE TYPE "ConflictSource" AS ENUM ('MANUAL', 'MATHEMATICAL', 'AI_GENERATED');

-- CreateTable
CREATE TABLE "concepts" (
    "id" SERIAL NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "category" TEXT NOT NULL,
    "sub_category" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "logic" TEXT NOT NULL,
    "appeal" TEXT NOT NULL,
    "examples" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "levels" JSONB DEFAULT '[]',
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "raw_input" TEXT,
    "metadata" JSONB,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "embedding" vector(1024),

    CONSTRAINT "concepts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concept_conflicts" (
    "id" SERIAL NOT NULL,
    "type" "ConflictType" NOT NULL DEFAULT 'LOGICAL',
    "source" "ConflictSource" NOT NULL DEFAULT 'MANUAL',
    "reason" TEXT,
    "severity" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "concept_a_id" INTEGER NOT NULL,
    "concept_b_id" INTEGER NOT NULL,

    CONSTRAINT "concept_conflicts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concept_edges" (
    "id" SERIAL NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'semantic',
    "source_concept_id" INTEGER NOT NULL,
    "target_concept_id" INTEGER NOT NULL,

    CONSTRAINT "concept_edges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "concepts_slug_key" ON "concepts"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "concept_conflicts_concept_a_id_concept_b_id_key" ON "concept_conflicts"("concept_a_id", "concept_b_id");

-- CreateIndex
CREATE UNIQUE INDEX "concept_edges_source_concept_id_target_concept_id_key" ON "concept_edges"("source_concept_id", "target_concept_id");

-- AddForeignKey
ALTER TABLE "concept_conflicts" ADD CONSTRAINT "concept_conflicts_concept_a_id_fkey" FOREIGN KEY ("concept_a_id") REFERENCES "concepts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concept_conflicts" ADD CONSTRAINT "concept_conflicts_concept_b_id_fkey" FOREIGN KEY ("concept_b_id") REFERENCES "concepts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concept_edges" ADD CONSTRAINT "concept_edges_source_concept_id_fkey" FOREIGN KEY ("source_concept_id") REFERENCES "concepts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concept_edges" ADD CONSTRAINT "concept_edges_target_concept_id_fkey" FOREIGN KEY ("target_concept_id") REFERENCES "concepts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
