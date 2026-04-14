/** Слот расписания с опциональной привязкой к уроку из каталога. */
export type ScheduleSlotForPastCheck = {
  lessonTemplateId?: string | null;
  startsAt: string;
  endsAt: string | null;
  durationMinutes?: number;
};

export function slotEndedInPast(slot: ScheduleSlotForPastCheck, nowMs: number = Date.now()): boolean {
  const startMs = new Date(slot.startsAt).getTime();
  const endMs = slot.endsAt
    ? new Date(slot.endsAt).getTime()
    : startMs + (slot.durationMinutes ?? 90) * 60_000;
  return endMs < nowMs;
}

/** id шаблонов уроков, по которым уже был слот в прошлом (конец слота раньше «сейчас»). */
export function passedLessonTemplateIdsFromSlots(slots: ScheduleSlotForPastCheck[]): Set<string> {
  const out = new Set<string>();
  for (const s of slots) {
    const id = s.lessonTemplateId;
    if (id && slotEndedInPast(s)) {
      out.add(id);
    }
  }
  return out;
}
