import { Card, Space, Tag, Typography } from "antd";
import type { StudioGoal } from "@/shared/types/lessonContent";

const { Text } = Typography;

export type MiniWorkspaceGoalsOverlayProps = {
  goals: StudioGoal[];
  goalStatus: Record<string, boolean>;
  allGoalsDone: boolean;
};

/** Только цели поверх Blockly (справа сверху); персонаж остаётся в колонке «Сцена». */
export function MiniWorkspaceGoalsOverlay({ goals, goalStatus, allGoalsDone }: MiniWorkspaceGoalsOverlayProps) {
  if (goals.length === 0) {
    return null;
  }

  return (
    <div className="mini-workspace-goals-overlay" aria-label="Цели урока">
      <Card size="small" className="mini-workspace-goals-overlay__card">
        <Text strong>Цели</Text>
        <Space direction="vertical" size={4} style={{ width: "100%", marginTop: 6 }}>
          {goals.map((g) => (
            <div key={g.id} className="mini-workspace-goals-overlay__row">
              <Tag color={goalStatus[g.id] ? "success" : "default"}>{goalStatus[g.id] ? "Готово" : "Ждём"}</Tag>
              <Text>{g.title}</Text>
            </div>
          ))}
        </Space>
        {allGoalsDone ? (
          <Text type="success" style={{ display: "block", marginTop: 8 }}>
            Все цели выполнены — отличная работа!
          </Text>
        ) : null}
      </Card>
    </div>
  );
}
