export type LessonPlayerCheckpointStatus = "pending" | "ok";

export type LessonPlayerStateV1 = {
  v: 1;
  /** Просмотрен блок материалов (слайды/PDF) */
  materialsDone?: boolean;
  /** Индексы чекпоинтов, сданных верно */
  checkpoints?: Record<string, LessonPlayerCheckpointStatus>;
};

export function normalizeCheckpointAnswer(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export function parseLessonPlayerState(raw: unknown): LessonPlayerStateV1 {
  if (raw && typeof raw === "object" && (raw as { v?: unknown }).v === 1) {
    return raw as LessonPlayerStateV1;
  }
  return { v: 1, checkpoints: {} };
}
