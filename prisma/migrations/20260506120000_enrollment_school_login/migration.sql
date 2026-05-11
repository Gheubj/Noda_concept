-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN "schoolLogin" TEXT;

-- Backfill: lowercase nick; resolve duplicates within same classroom
WITH base AS (
  SELECT
    e.id AS eid,
    e."classroomId" AS cid,
    LOWER(TRIM(u.nickname)) AS slog
  FROM "Enrollment" e
  INNER JOIN "User" u ON u.id = e."studentId"
),
ranked AS (
  SELECT
    eid,
    CASE
      WHEN rn = 1 THEN slog
      ELSE slog || '-' || rn::text
    END AS final_login
  FROM (
    SELECT
      eid,
      slog,
      ROW_NUMBER() OVER (PARTITION BY cid, slog ORDER BY eid) AS rn
    FROM base
  ) x
)
UPDATE "Enrollment" e
SET "schoolLogin" = r.final_login
FROM ranked r
WHERE e.id = r.eid;

UPDATE "Enrollment"
SET "schoolLogin" = 'legacy-' || RIGHT(id, 6)
WHERE "schoolLogin" IS NULL;

ALTER TABLE "Enrollment" ALTER COLUMN "schoolLogin" SET NOT NULL;

CREATE UNIQUE INDEX "Enrollment_classroomId_schoolLogin_key" ON "Enrollment"("classroomId", "schoolLogin");
