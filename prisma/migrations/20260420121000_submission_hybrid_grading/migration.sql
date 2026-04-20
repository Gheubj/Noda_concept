-- Add hybrid grading statuses for LMS homework flow
ALTER TYPE "SubmissionStatus" ADD VALUE IF NOT EXISTS 'auto_checked';
ALTER TYPE "SubmissionStatus" ADD VALUE IF NOT EXISTS 'pending_teacher_review';

-- Add score breakdown fields for auto/manual grading
ALTER TABLE "Submission"
ADD COLUMN IF NOT EXISTS "autoScore" INTEGER,
ADD COLUMN IF NOT EXISTS "manualScore" INTEGER,
ADD COLUMN IF NOT EXISTS "scoreBreakdown" JSONB;
