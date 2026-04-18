import type { StudioGoal } from "@/shared/types/lessonContent";
import type { MiniDevTelemetry } from "@/shared/types/lessonPlayerState";

export type BlocklyGoalSummary = {
  blockTypes: Set<string>;
  datasetKinds: Set<"image" | "tabular">;
};

export function summarizeBlocklyState(rawState: string): BlocklyGoalSummary {
  const summary: BlocklyGoalSummary = { blockTypes: new Set(), datasetKinds: new Set() };
  if (!rawState) {
    return summary;
  }
  try {
    const parsed = JSON.parse(rawState) as { blocks?: { blocks?: unknown[] } };
    const roots = parsed?.blocks?.blocks;
    const visit = (node: unknown) => {
      if (!node || typeof node !== "object") {
        return;
      }
      const item = node as {
        type?: string;
        fields?: Record<string, unknown>;
        next?: { block?: unknown };
        inputs?: Record<string, { block?: unknown }>;
      };
      if (item.type) {
        summary.blockTypes.add(item.type);
      }
      const datasetRef = typeof item.fields?.DATASET_REF === "string" ? item.fields.DATASET_REF : "";
      if (datasetRef.startsWith("image:")) {
        summary.datasetKinds.add("image");
      }
      if (datasetRef.startsWith("tabular:")) {
        summary.datasetKinds.add("tabular");
      }
      if (item.next?.block) {
        visit(item.next.block);
      }
      if (item.inputs) {
        for (const input of Object.values(item.inputs)) {
          if (input?.block) {
            visit(input.block);
          }
        }
      }
    };
    if (Array.isArray(roots)) {
      roots.forEach(visit);
    }
  } catch {
    return summary;
  }
  return summary;
}

export function evalMiniStudioGoal(
  goal: StudioGoal,
  summary: BlocklyGoalSummary,
  telemetry: MiniDevTelemetry | undefined
): boolean {
  if (goal.type === "add_block") {
    return summary.blockTypes.has(goal.blockType);
  }
  if (goal.type === "select_dataset") {
    return summary.datasetKinds.has(goal.datasetKind);
  }
  if (goal.type === "train_model") {
    return Boolean(telemetry?.trained);
  }
  if (goal.type === "run_prediction") {
    return Boolean(telemetry?.predicted);
  }
  return false;
}
