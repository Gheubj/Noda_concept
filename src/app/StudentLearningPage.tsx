import { useEffect, useMemo, useState } from "react";
import { Button, Card, List, Select, Space, Typography, message } from "antd";
import { Link } from "react-router-dom";
import { useSessionStore } from "@/store/useSessionStore";
import { apiClient } from "@/shared/api/client";
import { useOpenLessonTemplate, type LessonTemplateListItem } from "@/hooks/useOpenLessonTemplate";
import { LessonContentMaterials } from "@/components/LessonContentMaterials";
import { EMPTY_LESSON_CONTENT, type LessonContent } from "@/shared/types/lessonContent";

const { Title, Paragraph } = Typography;

export function StudentLearningPage() {
  const { user } = useSessionStore();
  const [messageApi, pageMessageHolder] = message.useMessage();
  const { openTemplate, openingId, contextHolder } = useOpenLessonTemplate();
  const [templates, setTemplates] = useState<LessonTemplateListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [focusId, setFocusId] = useState<string>("");
  const [detailSummary, setDetailSummary] = useState<string | null>(null);
  const [detailLessonContent, setDetailLessonContent] = useState<LessonContent | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const raw = await apiClient.get<unknown>("/api/lesson-templates");
        const list = Array.isArray(raw) ? (raw as LessonTemplateListItem[]) : [];
        setTemplates(list);
        setFocusId((prev) => {
          if (prev && list.some((t) => t.id === prev)) {
            return prev;
          }
          return list[0]?.id ?? "";
        });
      } catch {
        setTemplates([]);
        setFocusId("");
        messageApi.error("Не удалось загрузить каталог уроков");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- messageApi стабилен для UX
  }, []);

  useEffect(() => {
    if (!focusId) {
      setDetailSummary(null);
      setDetailLessonContent(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const d = await apiClient.get<{
          studentSummary: string | null;
          lessonContent: LessonContent | null;
        }>(`/api/lesson-templates/${encodeURIComponent(focusId)}/content`);
        if (!cancelled) {
          setDetailSummary(d.studentSummary);
          setDetailLessonContent(d.lessonContent ?? null);
        }
      } catch {
        if (!cancelled) {
          setDetailSummary(null);
          setDetailLessonContent(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [focusId]);

  const active = useMemo(() => templates.find((t) => t.id === focusId) ?? null, [templates, focusId]);

  const lessonContent: LessonContent = useMemo(() => {
    if (detailLessonContent) {
      return detailLessonContent;
    }
    if (active?.lessonContent) {
      return active.lessonContent as LessonContent;
    }
    return EMPTY_LESSON_CONTENT;
  }, [active, detailLessonContent]);

  if (!user) {
    return (
      <Card>
        <Paragraph>Войдите, чтобы открыть раздел обучения</Paragraph>
        <Link to="/">На главную</Link>
      </Card>
    );
  }

  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      {pageMessageHolder}
      {contextHolder}
      <div>
        <Title level={5} style={{ marginTop: 0 }}>
          Обучение
        </Title>
        <Paragraph type="secondary" style={{ marginBottom: 0 }}>
          Материалы урока (PDF, слайды, шаги) — ниже. Песочница Blockly — в разработке. Интерактивное прохождение с
          проверкой чекпоинтов — по ссылке «Пройти урок».
        </Paragraph>
      </div>
      <Card size="small" title="Каталог">
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Select
            style={{ width: "100%", maxWidth: 480 }}
            loading={loading}
            placeholder="Выбери урок"
            value={focusId || undefined}
            onChange={setFocusId}
            options={templates.map((t) => ({ value: t.id, label: `${t.title} (${t.moduleKey})` }))}
          />
          <List
            bordered
            loading={loading}
            dataSource={templates}
            locale={{ emptyText: "Пока нет опубликованных уроков" }}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Link key="player" to={`/lesson/${encodeURIComponent(item.id)}`}>
                    Пройти урок
                  </Link>,
                  <Button
                    key="go"
                    type="primary"
                    size="small"
                    loading={openingId === item.id}
                    onClick={() => void openTemplate(item)}
                  >
                    Открыть в разработке
                  </Button>
                ]}
              >
                <List.Item.Meta
                  title={item.title}
                  description={item.description ?? `Модуль: ${item.moduleKey}`}
                />
              </List.Item>
            )}
          />
        </Space>
      </Card>
      {active ? (
        <LessonContentMaterials
          lessonTitle={active.title}
          studentSummary={detailSummary}
          lessonContent={lessonContent}
          showCheckpointAnswers={false}
          footer={
            <Space wrap>
              <Link to={`/lesson/${encodeURIComponent(active.id)}`}>Интерактивное прохождение</Link>
              <Button type="primary" loading={openingId === active.id} onClick={() => void openTemplate(active)}>
                Открыть в разработке (Studio)
              </Button>
            </Space>
          }
        />
      ) : (
        <Card size="small">
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Выбери урок в списке выше, чтобы увидеть материалы.
          </Paragraph>
        </Card>
      )}
    </Space>
  );
}
