import type { CoachMood, TrainingState } from "@/shared/types/ai";

/** Какое PNG показывать для состояния персонажа. */
export function coachPngForMood(mood: CoachMood): string {
  switch (mood) {
    case "working":
      return "/coach/working.png";
    case "talking":
      return "/coach/talking.png";
    case "success":
      return "/coach/success.png";
    case "error":
      return "/coach/error.png";
    case "idle":
    default:
      return "/coach/idle.png";
  }
}

/** Согласовано с логикой Blockly / стора: явный coachMood или эвристика по полям. */
export function resolveCoachMood(training: TrainingState): CoachMood {
  if (training.coachMood) {
    return training.coachMood;
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
