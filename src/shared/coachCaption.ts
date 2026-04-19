import type { ModelEvaluation, PredictionResult } from "@/shared/types/ai";

/** Один текст для пузыря персонажа, если нет блока «показать сообщение». */
export function buildAutoResultsCaption(
  evaluation: ModelEvaluation | null,
  prediction: PredictionResult | null
): string {
  if (!evaluation && !prediction) {
    return "";
  }
  const parts: string[] = ["Вот результаты:"];
  if (evaluation?.metrics?.testAccuracy != null) {
    const a = evaluation.metrics.testAccuracy;
    parts.push(`Точность на тесте: ${(a * 100).toFixed(1)}%.`);
  } else if (evaluation?.summary?.trim()) {
    parts.push(evaluation.summary.trim());
  }
  if (evaluation?.metrics?.macroF1 != null) {
    const f = evaluation.metrics.macroF1;
    parts.push(`F1 (macro): ${(f * 100).toFixed(1)}%.`);
  }
  if (prediction) {
    parts.push(
      `Предсказание: ${prediction.title} (уверенность ${(prediction.confidence * 100).toFixed(0)}%).`
    );
  }
  return parts.join("\n");
}
