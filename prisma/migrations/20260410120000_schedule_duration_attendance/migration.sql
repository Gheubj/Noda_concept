-- AlterTable
ALTER TABLE "ClassScheduleSlot" ADD COLUMN "durationMinutes" INTEGER NOT NULL DEFAULT 90;

UPDATE "ClassScheduleSlot"
SET "durationMinutes" = GREATEST(
  1,
  LEAST(
    720,
    ROUND(EXTRACT(EPOCH FROM ("endsAt" - "startsAt")) / 60)::int
  )
)
WHERE "endsAt" IS NOT NULL;

-- CreateTable
CREATE TABLE "ScheduleSlotAttendance" (
    "id" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "plansToAttend" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleSlotAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleSlotAttendance_slotId_studentId_key" ON "ScheduleSlotAttendance"("slotId", "studentId");

-- CreateIndex
CREATE INDEX "ScheduleSlotAttendance_studentId_idx" ON "ScheduleSlotAttendance"("studentId");

-- AddForeignKey
ALTER TABLE "ScheduleSlotAttendance" ADD CONSTRAINT "ScheduleSlotAttendance_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "ClassScheduleSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleSlotAttendance" ADD CONSTRAINT "ScheduleSlotAttendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
