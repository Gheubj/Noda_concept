import dayjs, { type Dayjs } from "dayjs";
import { MAX_CALENDAR_STRETCH_DAYS, SCHEDULE_PREVIEW_DAY_COUNT } from "@/shared/scheduleHorizon";
import { isOverdueByDueAt, submissionStatusUnfinished } from "@/shared/studentAssignmentDue";

/** Последний календарный день начала слота ≥ сегодня (для скольжения окна занятий). */
export function lastLessonAnchorDay(slotStartsAtIso: string[], ref: Dayjs = dayjs()): Dayjs | null {
  const t0 = ref.startOf("day");
  let best: Dayjs | null = null;
  for (const iso of slotStartsAtIso) {
    const d = dayjs(iso).startOf("day");
    if (d.isBefore(t0)) {
      continue;
    }
    if (!best || d.isAfter(best)) {
      best = d;
    }
  }
  return best;
}

type HomeworkAnchorRow = {
  kind: string;
  dueAt: string | null;
  submission: { status: string } | null;
};

/** Последний день срока ≥ сегодня среди незавершённых ДЗ (просрочка не двигает окно). */
export function lastHomeworkDueAnchorDay(rows: HomeworkAnchorRow[], ref: Dayjs = dayjs()): Dayjs | null {
  const t0 = ref.startOf("day");
  let best: Dayjs | null = null;
  for (const r of rows) {
    if (r.kind !== "homework" || !r.dueAt) {
      continue;
    }
    const st = r.submission?.status ?? "not_started";
    if (!submissionStatusUnfinished(st)) {
      continue;
    }
    if (isOverdueByDueAt(r.dueAt, st)) {
      continue;
    }
    const d = dayjs(r.dueAt).startOf("day");
    if (d.isBefore(t0)) {
      continue;
    }
    if (!best || d.isAfter(best)) {
      best = d;
    }
  }
  return best;
}

/**
 * Ровно `dayCount` последовательных календарных дней.
 * Последний день = min(max(сегодня + dayCount − 1, lastEventDay), сегодня + maxStretchDays).
 */
export function computeSlidingDayColumns(
  lastEventDay: Dayjs | null,
  ref: Dayjs = dayjs(),
  dayCount: number = SCHEDULE_PREVIEW_DAY_COUNT,
  maxStretchDays: number = MAX_CALENDAR_STRETCH_DAYS
): Dayjs[] {
  const t0 = ref.startOf("day");
  const defaultEnd = t0.add(dayCount - 1, "day");
  const capEnd = t0.add(maxStretchDays, "day");
  let end = defaultEnd;
  if (lastEventDay) {
    const ev = lastEventDay.startOf("day");
    if (!ev.isBefore(t0) && ev.isAfter(end)) {
      end = ev;
    }
  }
  if (end.isAfter(capEnd)) {
    end = capEnd;
  }
  const start = end.subtract(dayCount - 1, "day");
  return Array.from({ length: dayCount }, (_, i) => start.add(i, "day"));
}
