-- CreateTable
CREATE TABLE "LessonPlayerProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonTemplateId" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL DEFAULT 'direct',
    "state" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonPlayerProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LessonPlayerProgress_userId_lessonTemplateId_scopeKey_key" ON "LessonPlayerProgress"("userId", "lessonTemplateId", "scopeKey");

-- CreateIndex
CREATE INDEX "LessonPlayerProgress_lessonTemplateId_scopeKey_idx" ON "LessonPlayerProgress"("lessonTemplateId", "scopeKey");

-- AddForeignKey
ALTER TABLE "LessonPlayerProgress" ADD CONSTRAINT "LessonPlayerProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonPlayerProgress" ADD CONSTRAINT "LessonPlayerProgress_lessonTemplateId_fkey" FOREIGN KEY ("lessonTemplateId") REFERENCES "LessonTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
