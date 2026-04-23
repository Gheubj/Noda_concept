import { Alert, Skeleton, Typography } from "antd";
import dayjs from "dayjs";
import "dayjs/locale/ru";
import { Link } from "react-router-dom";
import type { SchedulePreviewSlot } from "@/app/HomeSchedulePreview";

dayjs.locale("ru");

const { Text } = Typography;

function nextUpcomingSlot(slots: SchedulePreviewSlot[]) {
  const soon = dayjs().subtract(30, "minute");
  const upcoming = slots
    .filter((s) => dayjs(s.startsAt).isAfter(soon))
    .sort((a, b) => dayjs(a.startsAt).valueOf() - dayjs(b.startsAt).valueOf());
  return upcoming[0] ?? null;
}

function timeRange(s: SchedulePreviewSlot) {
  const end = s.endsAt
    ? dayjs(s.endsAt)
    : dayjs(s.startsAt).add(s.durationMinutes, "minute");
  return `${dayjs(s.startsAt).format("HH:mm")}–${end.format("HH:mm")}`;
}

type Props = {
  slots: SchedulePreviewSlot[];
  /** Расписание уже загрузилось (хотя бы один ответ API) */
  scheduleReady: boolean;
  /** Есть классы, но ответ расписания ещё не пришёл */
  scheduleLoading: boolean;
  enrollmentsCount: number;
  attentionCount: number;
  summaryLoading: boolean;
};

/** Не ренерить пустую обёртку home-v2__surface на главной */
export function shouldShowHomeSchoolStudentBanner(p: Props): boolean {
  if (p.enrollmentsCount === 0) {
    return true;
  }
  if (p.attentionCount > 0 && !p.summaryLoading) {
    return true;
  }
  if (p.scheduleLoading) {
    return true;
  }
  if (p.scheduleReady && nextUpcomingSlot(p.slots)) {
    return true;
  }
  return false;
}

export function HomeSchoolStudentBanner({
  slots,
  scheduleReady,
  scheduleLoading,
  enrollmentsCount,
  attentionCount,
  summaryLoading
}: Props) {
  const next = scheduleReady ? nextUpcomingSlot(slots) : null;

  if (enrollmentsCount === 0) {
    return (
      <Alert
        type="info"
        showIcon
        className="landing-home-school-banner"
        message="Подключитесь к классу"
        description={
          <Text style={{ fontSize: 13 }}>
            Введите код класса в <Link to="/account">личном кабинете</Link> (блок «Код класса»), чтобы увидеть
            задания и расписание.
          </Text>
        }
      />
    );
  }

  const attentionBlock =
    attentionCount > 0 && !summaryLoading ? (
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 12 }}
        message={
          <span>
            Требует внимания: <strong>{attentionCount}</strong>{" "}
            {attentionCount === 1 ? "задание" : "заданий"} (оценка или доработка).{" "}
            <Link to="/class">Открыть Обучение</Link>
          </span>
        }
      />
    ) : null;

  const scheduleBlock = scheduleLoading ? (
    <div style={{ paddingTop: 4 }}>
      <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 8 }}>
        Загружаем расписание…
      </Text>
      <Skeleton active title={false} paragraph={{ rows: 2 }} />
    </div>
  ) : next ? (
    <div className="landing-home-next-lesson">
      <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
        Ближайшее занятие
      </Text>
      <Text strong style={{ fontSize: 14, display: "block" }}>
        {dayjs(next.startsAt).format("dddd, D MMMM")} · {timeRange(next)}
      </Text>
      <Text style={{ fontSize: 13 }}>{next.lessonTitle ?? "Занятие"}</Text>
    </div>
  ) : null;

  if (!attentionBlock && !scheduleBlock) {
    return null;
  }

  return (
    <div className="landing-home-school-banner">
      {attentionBlock}
      {scheduleBlock}
    </div>
  );
}
