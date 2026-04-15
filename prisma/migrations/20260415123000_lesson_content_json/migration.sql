-- Add structured lesson content for student-facing lesson screen.
ALTER TABLE "LessonTemplate"
ADD COLUMN "lessonContent" JSONB;
