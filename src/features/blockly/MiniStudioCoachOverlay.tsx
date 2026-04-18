import { Card, Space, Tag, Typography } from "antd";
import { useMemo } from "react";
import { useAppStore } from "@/store/useAppStore";
import type { CoachMood } from "@/shared/types/ai";
import type { StudioGoal } from "@/shared/types/lessonContent";

const { Text } = Typography;

export type MiniStudioCoachOverlayProps = {
  goals: StudioGoal[];
  goalStatus: Record<string, boolean>;
  allGoalsDone: boolean;
};

function moodToAsset(mood: CoachMood | undefined): string {
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

export function MiniStudioCoachOverlay({ goals, goalStatus, allGoalsDone }: MiniStudioCoachOverlayProps) {
  const training = useAppStore((s) => s.training);
  const mood: CoachMood = useMemo(() => {
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
  }, [training.coachMood, training.isTraining, training.message]);

  return (
    <div className="mini-coach-overlay mini-coach-overlay--on-workspace" aria-label="Подсказка">
      <Card size="small" className={`mini-coach-overlay__card mini-coach-overlay__card--${mood}`}>
        <div className="mini-coach-overlay__row">
          <img className="mini-coach-overlay__avatar" src={moodToAsset(mood)} alt="" width={56} height={56} />
          <div className="mini-coach-overlay__bubble">
            <Text>{training.message || "Ожидание"}</Text>
          </div>
        </div>
        {goals.length > 0 ? (
          <div className="mini-coach-overlay__goals">
            <Text strong>Цели</Text>
            <Space direction="vertical" size={4} style={{ width: "100%" }}>
              {goals.map((g) => (
                <div key={g.id} className="mini-coach-overlay__goal-row">
                  <Tag color={goalStatus[g.id] ? "success" : "default"}>
                    {goalStatus[g.id] ? "Готово" : "Ждём"}
                  </Tag>
                  <Text>{g.title}</Text>
                </div>
              ))}
            </Space>
          </div>
        ) : null}
        {allGoalsDone ? <Text type="success">Все цели выполнены — отличная работа!</Text> : null}
      </Card>
    </div>
  );
}

