import { Button, Card, Space, Spin, Tag, Typography, message } from "antd";
import dayjs from "dayjs";
import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "@/shared/api/client";
import type { HomeSchoolAssignmentRow } from "@/hooks/useHomeSchoolAssignments";
import {
  diaryKindLabels,
  diaryStatusLabels,
  studentSlotNeedsAttention,
  type SlotStudentAssignmentRow
} from "@/app/WeekScheduleCalendar";

const { Text, Paragraph } = Typography;

function toSlotRow(r: HomeSchoolAssignmentRow): SlotStudentAssignmentRow {
  return {
    assignmentId: r.assignmentId,
    classroomId: r.classroomId,
    classroomTitle: r.classroomTitle,
    schoolName: r.schoolName,
    title: r.title,
    kind: r.kind,
    dueAt: r.dueAt,
    maxScore: r.maxScore,
    submission: r.submission
  };
}

type Props = {
  rows: HomeSchoolAssignmentRow[];
  loading: boolean;
  onRefresh: () => void | Promise<void>;
};

export function HomeUpcomingHomework({ rows, loading, onRefresh }: Props) {
  const [messageApi, holder] = message.useMessage();
  const navigate = useNavigate();

  const homeworkAll = useMemo(() => {
    const list = rows.filter((r) => r.kind === "homework");
    list.sort((a, b) => {
      const da = a.dueAt ? dayjs(a.dueAt).valueOf() : Number.POSITIVE_INFINITY;
      const db = b.dueAt ? dayjs(b.dueAt).valueOf() : Number.POSITIVE_INFINITY;
      if (da !== db) {
        return da - db;
      }
      return a.title.localeCompare(b.title, "ru");
    });
    return list;
  }, [rows]);

  const startOrOpen = async (row: SlotStudentAssignmentRow) => {
    try {
      const res = await apiClient.post<{ projectId: string }>(
        `/api/student/assignments/${row.assignmentId}/start`,
        {}
      );
      navigate(`/studio?project=${encodeURIComponent(res.projectId)}`);
    } catch (e) {
      messageApi.error(e instanceof Error ? e.message : "Ошибка");
    }
  };

  const submitWork = async (row: SlotStudentAssignmentRow) => {
    try {
      await apiClient.post(`/api/student/assignments/${row.assignmentId}/submit`, {});
      messageApi.success("Работа сдана");
      await onRefresh();
    } catch (e) {
      messageApi.error(e instanceof Error ? e.message : "Ошибка");
    }
  };

  const markGradedSeen = async (row: SlotStudentAssignmentRow) => {
    const sid = row.submission?.id;
    if (!sid) {
      return;
    }
    try {
      await apiClient.post(`/api/student/submissions/${sid}/mark-graded-seen`, {});
      await onRefresh();
    } catch {
      messageApi.error("Не удалось отметить просмотр");
    }
  };

  return (
    <Card className="landing-home-homework" title="Домашние задания" size="small">
      {holder}
      <Spin spinning={loading}>
        {homeworkAll.length > 0 ? (
          <div className="landing-home-hw-row">
            {homeworkAll.map((r) => {
              const row = toSlotRow(r);
              const st = row.submission?.status ?? "not_started";
              const hasProject = Boolean(row.submission?.projectId);
              const sub = row.submission;
              const graded = st === "graded" && sub != null && sub.score != null;
              const scoreShown = graded ? sub.score : null;
              const overdue =
                r.dueAt &&
                dayjs(r.dueAt).endOf("day").isBefore(dayjs()) &&
                st !== "submitted" &&
                st !== "graded";
              return (
                <div key={r.assignmentId} className="landing-home-hw-chip">
                  <Tag color="purple" style={{ margin: 0, flexShrink: 0 }}>
                    {diaryKindLabels.homework}
                  </Tag>
                  {r.dueAt ? (
                    <Text type={overdue ? "danger" : "secondary"} style={{ fontSize: 11, flexShrink: 0 }}>
                      до {dayjs(r.dueAt).format("DD.MM")}
                      {overdue ? " · просрочено" : ""}
                    </Text>
                  ) : (
                    <Text type="secondary" style={{ fontSize: 11, flexShrink: 0 }}>
                      без срока
                    </Text>
                  )}
                  {graded && scoreShown != null ? (
                    <Text type="success" style={{ fontSize: 11, flexShrink: 0 }}>
                      {scoreShown}/{row.maxScore}
                    </Text>
                  ) : null}
                  {st === "submitted" && !graded ? (
                    <Text type="secondary" style={{ fontSize: 11, flexShrink: 0 }}>
                      на проверке
                    </Text>
                  ) : null}
                  <Tag color="default" style={{ margin: 0, flexShrink: 0 }}>
                    {diaryStatusLabels[st] ?? st}
                  </Tag>
                  {studentSlotNeedsAttention(row) ? (
                    <Tag color="red" style={{ margin: 0, flexShrink: 0 }}>
                      Важно
                    </Tag>
                  ) : null}
                  <Space size={4} wrap className="landing-home-hw-chip-btns">
                    {st === "not_started" || !row.submission ? (
                      <Button type="primary" size="small" onClick={() => void startOrOpen(row)}>
                        Начать
                      </Button>
                    ) : null}
                    {(st === "draft" || st === "needs_revision") && hasProject ? (
                      <Button size="small" onClick={() => void startOrOpen(row)}>
                        Продолжить
                      </Button>
                    ) : null}
                    {(st === "draft" || st === "needs_revision") && hasProject ? (
                      <Button size="small" onClick={() => void submitWork(row)}>
                        Сдать
                      </Button>
                    ) : null}
                    {st === "graded" && studentSlotNeedsAttention(row) ? (
                      <Button size="small" onClick={() => void markGradedSeen(row)}>
                        Понятно
                      </Button>
                    ) : null}
                  </Space>
                </div>
              );
            })}
          </div>
        ) : (
          <Paragraph type="secondary" style={{ marginBottom: 0, fontSize: 13 }}>
            Пока нет домашних заданий от учителя. Загляни в <Link to="/class">Обучение</Link> — там дневник и
            классные работы.
          </Paragraph>
        )}
        {homeworkAll.length > 0 ? (
          <Link to="/class" className="landing-home-homework__link">
            Открыть Обучение
          </Link>
        ) : null}
      </Spin>
    </Card>
  );
}
