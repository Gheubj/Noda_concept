import { Card, Space, Spin, Typography } from "antd";
import type { SessionUser } from "@/store/useSessionStore";

const { Text } = Typography;

export type SchoolStudentSummary = {
  assignmentAttentionCount?: number;
  homeworkTodoCount?: number;
  homeworkOverdueCount?: number;
  homeworkDueSoonCount?: number;
  submittedPendingReviewCount?: number;
  homeworkDoneGradedCount?: number;
  upcomingMarkedSlotsCount?: number;
  pastMarkedSlotsCount?: number;
};

type Props = {
  user: SessionUser;
  summary: SchoolStudentSummary;
  summaryLoading: boolean;
};

export function HomeSchoolStudentWelcome({ user, summary, summaryLoading }: Props) {
  const nick = user.nickname?.trim() || "ученик";

  const hwParts: string[] = [];
  if (summary.homeworkOverdueCount && summary.homeworkOverdueCount > 0) {
    hwParts.push(`просрочено ДЗ: ${summary.homeworkOverdueCount}`);
  }
  if (summary.homeworkDueSoonCount && summary.homeworkDueSoonCount > 0) {
    hwParts.push(`срок в ближайшие дни: ${summary.homeworkDueSoonCount}`);
  }
  if (summary.submittedPendingReviewCount && summary.submittedPendingReviewCount > 0) {
    hwParts.push(`на проверке у учителя: ${summary.submittedPendingReviewCount}`);
  }
  if (summary.assignmentAttentionCount && summary.assignmentAttentionCount > 0) {
    hwParts.push(`нужно открыть оценку или доработку: ${summary.assignmentAttentionCount}`);
  }
  if (summary.homeworkDoneGradedCount != null && summary.homeworkDoneGradedCount > 0) {
    hwParts.push(`ДЗ с оценкой: ${summary.homeworkDoneGradedCount}`);
  }

  const scheduleParts: string[] = [];
  if (summary.upcomingMarkedSlotsCount != null && summary.upcomingMarkedSlotsCount > 0) {
    scheduleParts.push(
      `в календаре отмечено «приду» на ${summary.upcomingMarkedSlotsCount} занятий в ближайшие недели (не факт посещения)`
    );
  }
  if (summary.pastMarkedSlotsCount != null && summary.pastMarkedSlotsCount > 0) {
    scheduleParts.push(
      `раньше отмечали план на ${summary.pastMarkedSlotsCount} прошедших занятий (тоже только отметка в календаре)`
    );
  }

  const hasAnything = hwParts.length > 0 || scheduleParts.length > 0;

  return (
    <Card className="landing-home-school-welcome" size="small" title={`Здравствуйте, ${nick}!`}>
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <div>
          <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 6 }}>
            Сводка
          </Text>
          <Spin spinning={summaryLoading}>
            {hasAnything ? (
              <Space direction="vertical" size="small" style={{ width: "100%" }}>
                {hwParts.length > 0 ? (
                  <Text style={{ fontSize: 13 }}>Домашние задания: {hwParts.join(" · ")}</Text>
                ) : null}
                {scheduleParts.length > 0 ? (
                  <Text style={{ fontSize: 13 }}>Расписание: {scheduleParts.join(" · ")}</Text>
                ) : null}
              </Space>
            ) : !summaryLoading ? (
              <Text type="secondary" style={{ fontSize: 13 }}>
                Всё в порядке — новых срочных задач нет. Полный список заданий — в разделе «Обучение».
              </Text>
            ) : null}
          </Spin>
        </div>
      </Space>
    </Card>
  );
}
