-- DropIndex
DROP INDEX "Challenge_datasetId_index_key";

-- DropIndex
DROP INDEX "Completion_gameStateId_challengeIndex_key";

-- DropIndex
DROP INDEX "Skip_gameStateId_challengeIndex_key";

-- AlterTable
ALTER TABLE "Challenge" DROP COLUMN "index",
ADD COLUMN     "position" INTEGER NOT NULL,
DROP COLUMN "datasetId",
ADD COLUMN     "datasetId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Completion" DROP COLUMN "challengeIndex",
ADD COLUMN     "challengeId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "GameSettings" DROP COLUMN "selectedDataset",
ADD COLUMN     "selectedDatasetId" TEXT;

-- AlterTable
ALTER TABLE "GameState" DROP COLUMN "challengeOrder",
ADD COLUMN     "challengeIds" TEXT[],
DROP COLUMN "datasetId",
ADD COLUMN     "datasetId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Skip" DROP COLUMN "challengeIndex",
ADD COLUMN     "challengeId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Submission" DROP COLUMN "challengeIndex",
ADD COLUMN     "challengeId" TEXT NOT NULL;

-- DropEnum
DROP TYPE "Dataset";

-- CreateTable
CREATE TABLE "Dataset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dataset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Dataset_name_key" ON "Dataset"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Challenge_datasetId_position_key" ON "Challenge"("datasetId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Completion_gameStateId_challengeId_key" ON "Completion"("gameStateId", "challengeId");

-- CreateIndex
CREATE UNIQUE INDEX "Skip_gameStateId_challengeId_key" ON "Skip"("gameStateId", "challengeId");

-- AddForeignKey
ALTER TABLE "GameState" ADD CONSTRAINT "GameState_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSettings" ADD CONSTRAINT "GameSettings_selectedDatasetId_fkey" FOREIGN KEY ("selectedDatasetId") REFERENCES "Dataset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

