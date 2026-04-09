-- CreateEnum
CREATE TYPE "CourseModule" AS ENUM ('A', 'B', 'C', 'D');

-- AlterTable
ALTER TABLE "Classroom" ADD COLUMN "courseModule" "CourseModule" NOT NULL DEFAULT 'A';

-- AlterTable
ALTER TABLE "LessonTemplate" ADD COLUMN "teacherGuideMd" TEXT,
ADD COLUMN "studentSummary" TEXT;

-- CreateTable
CREATE TABLE "ClassScheduleSlot" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "lessonTemplateId" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassScheduleSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClassScheduleSlot_classroomId_startsAt_idx" ON "ClassScheduleSlot"("classroomId", "startsAt");

-- AddForeignKey
ALTER TABLE "ClassScheduleSlot" ADD CONSTRAINT "ClassScheduleSlot_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassScheduleSlot" ADD CONSTRAINT "ClassScheduleSlot_lessonTemplateId_fkey" FOREIGN KEY ("lessonTemplateId") REFERENCES "LessonTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
