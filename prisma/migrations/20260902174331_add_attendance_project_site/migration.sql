-- AlterTable
ALTER TABLE "attendance" ADD COLUMN     "projectId" TEXT;

-- CreateIndex
CREATE INDEX "attendance_projectId_date_idx" ON "attendance"("projectId", "date");

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
