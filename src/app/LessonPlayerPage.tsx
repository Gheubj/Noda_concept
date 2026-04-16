import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Input,
  Layout,
  Space,
  Spin,
  Tag,
  Typography,
  message
} from "antd";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useSessionStore } from "@/store/useSessionStore";
import { apiClient } from "@/shared/api/client";
import { LessonContentMaterials } from "@/components/LessonContentMaterials";
import { EMPTY_LESSON_CONTENT, type LessonContent } from "@/shared/types/lessonContent";
import {
  normalizeCheckpointAnswer,
  parseLessonPlayerState,
  type LessonPlayerStateV1
} from "@/shared/types/lessonPlayerState";
import { createStudioProjectFromLessonTemplate } from "@/hooks/useOpenLessonTemplate";

const { Content } = Layout;
const { Title, Paragraph } = Typography;

type Bootstrap = {
  title: string;
  studentSummary: string | null;
  lessonContent: unknown;
  scopeKey: string;
  assignmentTitle: string | null;
  state: unknown;
};

function isStudioCta(cta: string | null | undefined): boolean {
  if (!cta) {
    return false;
  }
  const s = cta.toLowerCase();
  return s.includes("studio") || s === "open_studio";
}

export function LessonPlayerPage() {
  const { user } = useSessionStore();
  const navigate = useNavigate();
  const { lessonId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const assignmentId = searchParams.get("assignmentId");
  const [messageApi, holder] = message.useMessage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [playerState, setPlayerState] = useState<LessonPlayerStateV1>({ v: 1, checkpoints: {} });
  const [draftAnswers, setDraftAnswers] = useState<Record<number, string>>({});
  const [openingStudio, setOpeningStudio] = useState(false);

  const lessonContent: LessonContent = useMemo(() => {
    if (!bootstrap?.lessonContent || typeof bootstrap.lessonContent !== "object") {
      return EMPTY_LESSON_CONTENT;
    }
    return { ...EMPTY_LESSON_CONTENT, ...(bootstrap.lessonContent as LessonContent) };
  }, [bootstrap]);

  const persistState = useCallback(
    async (next: LessonPlayerStateV1) => {
      const q = assignmentId ? `?assignmentId=${encodeURIComponent(assignmentId)}` : "";
      setSaving(true);
      try {
        await apiClient.patch(`/api/student/lessons/${encodeURIComponent(lessonId)}/player-progress${q}`, {
          state: next
        });
        setPlayerState(next);
      } catch (e) {
        messageApi.error(e instanceof Error ? e.message : "Не удалось сохранить прогресс");
      } finally {
        setSaving(false);
      }
    },
    [assignmentId, lessonId, messageApi]
  );

  const load = useCallback(async () => {
    if (!lessonId) {
      return;
    }
    setLoading(true);
    try {
      const q = assignmentId ? `?assignmentId=${encodeURIComponent(assignmentId)}` : "";
      const data = await apiClient.get<Bootstrap>(
        `/api/student/lessons/${encodeURIComponent(lessonId)}/player-bootstrap${q}`
      );
      setBootstrap(data);
      setPlayerState(parseLessonPlayerState(data.state));
    } catch (e) {
      messageApi.error(e instanceof Error ? e.message : "Не удалось загрузить урок");
      setBootstrap(null);
    } finally {
      setLoading(false);
    }
  }, [assignmentId, lessonId, messageApi]);

  useEffect(() => {
    void load();
  }, [load]);

  const openStudio = async () => {
    if (!bootstrap) {
      return;
    }
    setOpeningStudio(true);
    try {
      const projectId = await createStudioProjectFromLessonTemplate({
        id: lessonId,
        title: bootstrap.title
      });
      navigate(`/studio?project=${encodeURIComponent(projectId)}`);
    } catch (e) {
      messageApi.error(e instanceof Error ? e.message : "Не удалось открыть Studio");
    } finally {
      setOpeningStudio(false);
    }
  };

  if (!user) {
    return (
      <Content className="app-content">
        <Card>
          <Link to="/">На главную</Link>
        </Card>
      </Content>
    );
  }

  if (user.role !== "student") {
    return (
      <Content className="app-content">
        <Card title="Плеер урока">
          <Paragraph>Интерактивное прохождение доступно ученикам.</Paragraph>
          <Link to="/">На главную</Link>
        </Card>
      </Content>
    );
  }

  const checkpointsOk = (idx: number) => playerState.checkpoints?.[String(idx)] === "ok";

  const verifyCheckpoint = async (idx: number, expected: string) => {
    const raw = draftAnswers[idx] ?? "";
    if (normalizeCheckpointAnswer(raw) !== normalizeCheckpointAnswer(expected)) {
      messageApi.warning("Пока не совпадает с ожидаемым ответом — попробуй ещё раз.");
      return;
    }
    const next: LessonPlayerStateV1 = {
      ...playerState,
      v: 1,
      checkpoints: { ...playerState.checkpoints, [String(idx)]: "ok" }
    };
    await persistState(next);
    messageApi.success("Верно!");
  };

  const markMaterialsDone = async () => {
    await persistState({ ...playerState, v: 1, materialsDone: true });
    messageApi.success("Отмечено");
  };

  const allCheckpointsDone =
    lessonContent.checkpoints.length === 0 ||
    lessonContent.checkpoints.every((_, i) => checkpointsOk(i));

  return (
    <Content className="app-content">
      {holder}
      <Spin spinning={loading}>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div>
            <Title level={4} style={{ marginTop: 0 }}>
              {bootstrap?.title ?? "Урок"}
            </Title>
            <Space wrap>
              <Link to="/learning">К каталогу (самостоятельно)</Link>
              <Link to="/class">К классу</Link>
            </Space>
          </div>
          {bootstrap?.assignmentTitle ? (
            <Alert
              type="info"
              showIcon
              message={`Задание: ${bootstrap.assignmentTitle}`}
              description="Прогресс сохраняется в контексте этого задания."
            />
          ) : null}
          {!bootstrap && !loading ? (
            <Card>Не удалось загрузить урок.</Card>
          ) : bootstrap ? (
            <>
              <Card title="Шаг 1 · Материалы">
                <LessonContentMaterials
                  lessonTitle={bootstrap.title}
                  studentSummary={bootstrap.studentSummary}
                  lessonContent={lessonContent}
                  showCheckpointAnswers={false}
                  showCheckpointsSection={false}
                />
                <Button
                  type="primary"
                  style={{ marginTop: 16 }}
                  loading={saving}
                  disabled={Boolean(playerState.materialsDone)}
                  onClick={() => void markMaterialsDone()}
                >
                  {playerState.materialsDone ? "Материалы отмечены просмотренными" : "Я просмотрел материалы"}
                </Button>
              </Card>

              <Card title="Шаг 2 · Практика в Studio">
                <Paragraph type="secondary">
                  По шагам ниже можно открыть полную среду разработки. Стартовый проект создаётся из шаблона урока.
                </Paragraph>
                <Space direction="vertical" style={{ width: "100%" }}>
                  {lessonContent.practiceSteps.map((step, idx) => (
                    <Card key={`p-${idx}`} size="small" title={`${idx + 1}. ${step.title}`}>
                      <Paragraph style={{ whiteSpace: "pre-wrap", marginBottom: 8 }}>{step.instruction}</Paragraph>
                      {isStudioCta(step.ctaAction) ? (
                        <Button type="primary" loading={openingStudio} onClick={() => void openStudio()}>
                          Открыть в Studio
                        </Button>
                      ) : null}
                    </Card>
                  ))}
                  {lessonContent.practiceSteps.length === 0 ? (
                    <Paragraph type="secondary">Практические шаги не заданы.</Paragraph>
                  ) : null}
                </Space>
              </Card>

              <Card title="Шаг 3 · Контрольные вопросы">
                {lessonContent.checkpoints.length === 0 ? (
                  <Paragraph type="secondary">Вопросы не заданы.</Paragraph>
                ) : (
                  <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                    {lessonContent.checkpoints.map((cp, idx) => (
                      <Card key={`c-${idx}`} size="small" title={`Вопрос ${idx + 1}`}>
                        <Paragraph>{cp.question}</Paragraph>
                        {checkpointsOk(idx) ? (
                          <Tag color="success">Верно</Tag>
                        ) : (
                          <Space direction="vertical" style={{ width: "100%" }}>
                            <Input.TextArea
                              rows={2}
                              placeholder="Твой ответ"
                              value={draftAnswers[idx] ?? ""}
                              onChange={(e) => setDraftAnswers((d) => ({ ...d, [idx]: e.target.value }))}
                            />
                            <Button loading={saving} onClick={() => void verifyCheckpoint(idx, cp.expectedAnswer)}>
                              Проверить
                            </Button>
                          </Space>
                        )}
                      </Card>
                    ))}
                  </Space>
                )}
              </Card>

              {allCheckpointsDone && lessonContent.checkpoints.length > 0 ? (
                <Alert type="success" showIcon message="Все контрольные вопросы пройдены" />
              ) : null}
            </>
          ) : null}
        </Space>
      </Spin>
    </Content>
  );
}
