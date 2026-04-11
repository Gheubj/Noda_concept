-- AlterTable
ALTER TABLE "Project" ADD COLUMN "lessonTemplateId" TEXT;
ALTER TABLE "Project" ADD COLUMN "catalogLessonComplete" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_lessonTemplateId_fkey" FOREIGN KEY ("lessonTemplateId") REFERENCES "LessonTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
