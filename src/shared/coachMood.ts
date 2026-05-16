import type { CoachMood, TrainingState } from "@/shared/types/ai";

function normalizeCoachMood(raw: CoachMood | string | undefined): CoachMood {
  if (
    raw === "working" ||
    raw === "success" ||
    raw === "error" ||
    raw === "idle" ||
    raw === "talking"
  ) {
    return raw;
  }
  return "idle";
}

/** Какое PNG показывать для состояния персонажа. */
export function coachPngForMood(mood: CoachMood | string | undefined): string {
  const m = normalizeCoachMood(mood);
  switch (m) {
    case "working":
      return "/coach/working.png";
    case "success":
      return "/coach/success.png";
    case "error":
      return "/coach/error.png";
    case "talking":
      return "/coach/talking.png";
    case "idle":
    default:
      return "/coach/idle.png";
  }
}

export type ResolveCoachMoodOpts = {
  /** Текст из блока «Показать сообщение» — отдельно от training.message. */
  coachUserMessage?: string | null;
};

/** Согласовано с логикой Blockly / стора: явный coachMood или эвристика по полям. */
export function resolveCoachMood(training: TrainingState, opts?: ResolveCoachMoodOpts): CoachMood {
  if (opts?.coachUserMessage?.trim()) {
    return "talking";
  }
  if (training.coachMood) {
    return normalizeCoachMood(training.coachMood);
  }
  if (training.isTraining) {
    return "working";
  }
  const msg = (training.message || "").toLowerCase();
  if (msg.includes("ошиб") || msg.includes("error")) {
    return "error";
  }
  if (msg.trim().length > 0 && msg !== "ожидание") {
    return "talking";
  }
  return "idle";
}
