import type { ModelComparisonReport, ModelEvaluation, PredictionResult } from "@/shared/types/ai";

/** Короткая реплика персонажа, если нет блока «показать сообщение». */
export const COACH_AUTO_RESULTS_LEAD = "Вот результаты:";

export type CoachBriefLine = { key: string; label: string; value: string };

/** Краткие строки под пузырём (без дублирования длинного summary, если уже есть точность). */
export function buildCoachBriefLines(
  evaluation: ModelEvaluation | null,
  prediction: PredictionResult | null,
  comparison: ModelComparisonReport | null
): CoachBriefLine[] {
  const out: CoachBriefLine[] = [];
  if (comparison?.rows?.length) {
    out.push({
      key: "cmp_count",
      label: "Сравнение",
      value: `${comparison.rows.length} моделей`
    });
    const best = comparison.rows[0];
    if (best) {
      out.push({
        key: "cmp_best",
        label: "Лучшая",
        value: `${best.modelType} (${(best.universalScore * 100).toFixed(1)}%)`
      });
    }
    for (const row of comparison.rows) {
      const primary =
        row.primaryMetricKey === "testAccuracy"
          ? `${(row.primaryMetricValue * 100).toFixed(1)}%`
          : row.primaryMetricValue.toFixed(4);
      out.push({
        key: `cmp_${row.modelType}_${row.primaryMetricKey}`,
        label: row.modelType,
        value: `${row.primaryMetricKey}: ${primary}, score ${(row.universalScore * 100).toFixed(1)}%`
      });
    }
  }
  if (!comparison?.rows?.length) {
    if (evaluation?.metrics?.testAccuracy != null) {
      out.push({
        key: "acc",
        label: "Точность (тест)",
        value: `${(evaluation.metrics.testAccuracy * 100).toFixed(1)}%`
      });
    } else if (evaluation?.summary?.trim()) {
      out.push({ key: "sum", label: "Модель", value: evaluation.summary.trim() });
    }
    if (evaluation?.metrics?.macroF1 != null) {
      out.push({
        key: "f1",
        label: "F1 (macro)",
        value: `${(evaluation.metrics.macroF1 * 100).toFixed(1)}%`
      });
    }
  }
  if (prediction) {
    const isRegressionPrediction = prediction.labelId === "regression_output";
    out.push({
      key: "pred",
      label: "Предсказание",
      value: isRegressionPrediction
        ? prediction.title
        : `${prediction.title} (${(prediction.confidence * 100).toFixed(0)}% уверенности)`
    });
  }
  return out;
}
