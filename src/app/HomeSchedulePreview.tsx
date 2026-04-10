import { Button, Card, Spin, Space, Tag, Typography, message } from "antd";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/shared/api/client";
import type { HomeSchoolAssignmentRow } from "@/hooks/useHomeSchoolAssignments";
import { useSessionStore } from "@/store/useSessionStore";
import { diaryKindLabels, studentSlotNeedsAttention, type SlotStudentAssignmentRow } from "@/app/WeekScheduleCalendar";

const { Text } = Typography;

const DAY_COUNT = 4;

type PreviewSlot = {
  id: string;
  startsAt: string;
  endsAt?: string;
  durationMinutes: number;
  lessonTitle: string | null;
  notes: string | null;
  classroomTitle: string;
  classroomId: string;
};

function sortSlotAssignments(items: HomeSchoolAssignmentRow[]): HomeSchoolAssignmentRow[] {
  const rank = (k: string) => (k === "classwork" ? 0 : k === "homework" ? 1 : 2);
  return [...items].sort((a, b) => rank(a.kind) - rank(b.kind));
}

function toSlotStudentRow(r: HomeSchoolAssignmentRow): SlotStudentAssignmentRow {
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
  /** Задания ученика — для кнопок у слотов (только школьный режим) */
  studentAssignments?: HomeSchoolAssignmentRow[];
  onAfterSlotAssignmentAction?: () => void | Promise<void>;
};

export function HomeSchedulePreview({ studentAssignments, onAfterSlotAssignmentAction }: Props) {
  const { user } = useSessionStore();
  const navigate = useNavigate();
  const [messageApi, messageHolder] = message.useMessage();
  const showClassroomTitle = user?.role === "teacher";
  const isSchoolStudent = Boolean(user?.role === "student" && user.studentMode === "school");
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<PreviewSlot[]>([]);

  const assignmentsBySlotId = useMemo(() => {
    const m = new Map<string, HomeSchoolAssignmentRow[]>();
    for (const a of studentAssignments ?? []) {
      if (!a.scheduleSlotId) {
        continue;
      }
      const arr = m.get(a.scheduleSlotId) ?? [];
      arr.push(a);
      m.set(a.scheduleSlotId, arr);
    }
    for (const key of [...m.keys()]) {
      const arr = m.get(key);
      if (arr) {
        m.set(key, sortSlotAssignments(arr));
      }
    }
    return m;
  }, [studentAssignments]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const data = await apiClient.get<{ slots: PreviewSlot[] }>("/api/me/schedule-preview");
        if (!cancelled) {
          setSlots(data.slots);
        }
      } catch {
        if (!cancelled) {
          setSlots([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const columns = useMemo(() => {
    const start = dayjs().startOf("day");
    return Array.from({ length: DAY_COUNT }, (_, i) => start.add(i, "day"));
  }, []);

  const slotsByDay = useMemo(() => {
    const keys = new Set(columns.map((d) => d.format("YYYY-MM-DD")));
    const map = new Map<string, PreviewSlot[]>();
    for (const k of keys) {
      map.set(k, []);
    }
    for (const s of slots) {
      const k = dayjs(s.startsAt).format("YYYY-MM-DD");
      if (!map.has(k)) {
        continue;
      }
      map.get(k)!.push(s);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => dayjs(a.startsAt).valueOf() - dayjs(b.startsAt).valueOf());
    }
    return map;
  }, [slots, columns]);

  const todayKey = dayjs().format("YYYY-MM-DD");

  const refresh = async () => {
    await onAfterSlotAssignmentAction?.();
  };

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
      await refresh();
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
      await refresh();
    } catch {
      messageApi.error("Не удалось отметить просмотр");
    }
  };

  const renderSlotAssignmentChips = (slotId: string) => {
    if (!isSchoolStudent || !studentAssignments) {
      return null;
    }
    const raw = assignmentsBySlotId.get(slotId) ?? [];
    if (raw.length === 0) {
      return null;
    }
    return (
      <div className="landing-home-schedule__slot-actions-row">
        {raw.map((a) => {
          const row = toSlotStudentRow(a);
          const st = row.submission?.status ?? "not_started";
          const hasProject = Boolean(row.submission?.projectId);
          const tagColor = a.kind === "classwork" ? "blue" : a.kind === "homework" ? "purple" : "default";
          return (
            <div key={a.assignmentId} className="landing-home-schedule__slot-action-chip">
              <Tag color={tagColor} style={{ margin: 0, flexShrink: 0 }}>
                {diaryKindLabels[a.kind] ?? a.kind}
              </Tag>
              <Space size={4} wrap className="landing-home-schedule__slot-action-chip-btns">
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
    );
  };

  return (
    <Card className="landing-home-schedule" title="Ближайшие занятия" size="small">
      {messageHolder}
      <Spin spinning={loading}>
        <div className="landing-home-schedule__grid">
          {columns.map((d) => {
            const key = d.format("YYYY-MM-DD");
            const daySlots = slotsByDay.get(key) ?? [];
            const isToday = key === todayKey;
            return (
              <div
                key={key}
                className={`landing-home-schedule__day${isToday ? " landing-home-schedule__day--today" : ""}`}
              >
                <Text strong className="landing-home-schedule__day-title">
                  {isToday ? "Сегодня" : d.format("dd, D MMM")}
                </Text>
                <div className="landing-home-schedule__slots">
                  {daySlots.length === 0 ? (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Нет занятий
                    </Text>
                  ) : (
                    daySlots.map((s) => (
                      <div
                        key={s.id}
                        className={`landing-home-schedule__slot${!showClassroomTitle ? " landing-home-schedule__slot--student" : ""}`}
                      >
                        {showClassroomTitle ? (
                          <>
                            <Text strong style={{ fontSize: 13 }}>
                              {dayjs(s.startsAt).format("HH:mm")}–
                              {(s.endsAt
                                ? dayjs(s.endsAt)
                                : dayjs(s.startsAt).add(s.durationMinutes, "minute")
                              ).format("HH:mm")}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                              {s.classroomTitle}
                            </Text>
                            <Text style={{ fontSize: 12 }}>{s.lessonTitle ?? "Занятие"}</Text>
                            {s.notes ? (
                              <Text type="secondary" ellipsis style={{ fontSize: 11, display: "block" }}>
                                {s.notes}
                              </Text>
                            ) : null}
                          </>
                        ) : (
                          <>
                            <Text strong className="landing-home-schedule__slot-time">
                              {dayjs(s.startsAt).format("HH:mm")}–
                              {(s.endsAt
                                ? dayjs(s.endsAt)
                                : dayjs(s.startsAt).add(s.durationMinutes, "minute")
                              ).format("HH:mm")}
                            </Text>
                            <Text className="landing-home-schedule__slot-lesson">
                              {s.lessonTitle ?? "Занятие"}
                            </Text>
                            {s.notes ? (
                              <Text type="secondary" ellipsis className="landing-home-schedule__slot-notes">
                                {s.notes}
                              </Text>
                            ) : null}
                            {renderSlotAssignmentChips(s.id)}
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Spin>
    </Card>
  );
}
