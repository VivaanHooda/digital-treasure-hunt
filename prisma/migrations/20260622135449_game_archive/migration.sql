-- CreateTable
CREATE TABLE "GameArchive" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "datasetName" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "teamCount" INTEGER NOT NULL,
    "topScore" INTEGER NOT NULL,
    "finishedCount" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data" JSONB NOT NULL,

    CONSTRAINT "GameArchive_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GameArchive_archivedAt_idx" ON "GameArchive"("archivedAt");
