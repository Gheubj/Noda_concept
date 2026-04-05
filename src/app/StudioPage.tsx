import { useEffect, useState } from "react";
import { Alert, Button, Drawer, Input, Layout, List, Modal, Space, Tabs, Typography, message } from "antd";
import { Link, useSearchParams } from "react-router-dom";
import { BlocklyWorkspace } from "@/features/blockly/BlocklyWorkspace";
import { DataLibrary } from "@/features/data/DataLibrary";
import { useAppStore } from "@/store/useAppStore";
import type { NodaProject, NodaProjectMeta, NodaProjectSnapshot } from "@/shared/types/project";
import { loadProjectSmart, listProjects, saveProjectSmart } from "@/features/project/projectRepository";
import { useSessionStore } from "@/store/useSessionStore";
import { apiClient } from "@/shared/api/client";

const { Content } = Layout;
const { Paragraph, Text } = Typography;

const GUEST_USER_ID_KEY = "noda_guest_user_id";
const DEFAULT_PROJECT_TITLE = "Новый проект";

const EMPTY_SNAPSHOT: NodaProjectSnapshot = {
  imageDatasets: [],
  tabularDatasets: [],
  imagePredictionInputs: [],
  tabularPredictionInputs: [],
  savedModels: [],
  blocklyState: ""
};

interface SubmissionContext {
  assignmentId: string;
  assignmentTitle: string;
  classroomTitle: string;
  status: string;
  canSubmit: boolean;
  teacherNote: string | null;
  revisionNote: string | null;
  score: number | null;
  maxScore: number;
}

export function StudioPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [messageApi, contextHolder] = message.useMessage();
  const [guestUserId] = useState(() => {
    const stored = localStorage.getItem(GUEST_USER_ID_KEY);
    if (stored) {
      return stored;
    }
    const next = `guest_${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(GUEST_USER_ID_KEY, next);
    return next;
  });
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState(DEFAULT_PROJECT_TITLE);
  const [projectItems, setProjectItems] = useState<NodaProjectMeta[]>([]);
  const [submittingAssignment, setSubmittingAssignment] = useState(false);
  const [submissionCtx, setSubmissionCtx] = useState<SubmissionContext | null>(null);
  const { getProjectSnapshot, loadProjectSnapshot, activeProject, setActiveProject } = useAppStore();
  const { user } = useSessionStore();
  const resolvedUserId = user?.id ?? guestUserId;
  const currentProjectTitle = activeProject?.title ?? DEFAULT_PROJECT_TITLE;
  const readOnly = Boolean(activeProject?.readOnly);

  const refreshProjects = async (nextUserId: string) => {
    const list = await listProjects(nextUserId.trim());
    setProjectItems(list);
  };

  useEffect(() => {
    void refreshProjects(resolvedUserId);
  }, [resolvedUserId]);

  const projectFromUrl = searchParams.get("project");
  useEffect(() => {
    if (!projectFromUrl || !user) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const project = await loadProjectSmart(projectFromUrl);
      if (cancelled) {
        return;
      }
      if (!project) {
        messageApi.error("Проект не найден");
        return;
      }
      setActiveProject(project.meta);
      loadProjectSnapshot(project.snapshot);
      setSaveTitle(project.meta.title);
      messageApi.success(`Загружен проект: ${project.meta.title}`);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("project");
          return next;
        },
        { replace: true }
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [projectFromUrl, user?.id, setSearchParams, setActiveProject, loadProjectSnapshot, messageApi]);

  const reviewSubmissionId = searchParams.get("reviewSubmission");
  useEffect(() => {
    if (!reviewSubmissionId || user?.role !== "teacher") {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const project = await apiClient.get<NodaProject>(
          `/api/teacher/submissions/${encodeURIComponent(reviewSubmissionId)}/work`
        );
        if (cancelled) {
          return;
        }
        setActiveProject(project.meta as NodaProjectMeta);
        loadProjectSnapshot(project.snapshot as NodaProjectSnapshot);
        setSaveTitle(project.meta.title);
        messageApi.success("Открыта работа ученика (только просмотр)");
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.delete("reviewSubmission");
            return next;
          },
          { replace: true }
        );
      } catch {
        if (!cancelled) {
          messageApi.error("Не удалось загрузить работу");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    reviewSubmissionId,
    user?.role,
    setSearchParams,
    setActiveProject,
    loadProjectSnapshot,
    messageApi
  ]);

  useEffect(() => {
    if (!user || user.role !== "student" || !activeProject?.id || activeProject.readOnly) {
      setSubmissionCtx(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const ctx = await apiClient.get<SubmissionContext>(
          `/api/student/projects/${encodeURIComponent(activeProject.id)}/submission-context`
        );
        if (!cancelled) {
          setSubmissionCtx(ctx);
        }
      } catch {
        if (!cancelled) {
          setSubmissionCtx(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.role, user?.id, activeProject?.id, activeProject?.readOnly]);

  const handleSave = async () => {
    if (readOnly) {
      messageApi.warning("Это просмотр работы ученика — сохранение отключено.");
      return;
    }
    const normalizedUserId = resolvedUserId.trim();
    const normalizedTitle = saveTitle.trim();
    if (!normalizedTitle) {
      messageApi.error("Укажи название проекта.");
      return;
    }
    const now = new Date().toISOString();
    const projectId = activeProject?.id ?? `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await saveProjectSmart({
      meta: {
        id: projectId,
        userId: normalizedUserId,
        title: normalizedTitle,
        createdAt: activeProject?.createdAt ?? now,
        updatedAt: now
      },
      snapshot: getProjectSnapshot()
    });
    setActiveProject({
      id: projectId,
      userId: normalizedUserId,
      title: normalizedTitle,
      createdAt: activeProject?.createdAt ?? now,
      updatedAt: now
    });
    await refreshProjects(normalizedUserId);
    setSaveOpen(false);
    messageApi.success("Проект сохранен");
  };

  const handleLoadProject = async (projectId: string) => {
    const project = await loadProjectSmart(projectId);
    if (!project) {
      messageApi.error("Проект не найден");
      return;
    }
    setActiveProject(project.meta);
    loadProjectSnapshot(project.snapshot);
    setLibraryOpen(false);
    messageApi.success(`Загружен проект: ${project.meta.title}`);
  };

  const handleNewProject = () => {
    setActiveProject(null);
    loadProjectSnapshot(EMPTY_SNAPSHOT);
    setSaveTitle(DEFAULT_PROJECT_TITLE);
    setSubmissionCtx(null);
    messageApi.success("Черновик нового проекта. Сохрани, когда будет готово.");
  };

  const handleSubmitFromStudio = async () => {
    if (!submissionCtx?.canSubmit || !activeProject?.id || readOnly) {
      return;
    }
    setSubmittingAssignment(true);
    try {
      const normalizedUserId = resolvedUserId.trim();
      const now = new Date().toISOString();
      await saveProjectSmart({
        meta: {
          id: activeProject.id,
          userId: normalizedUserId,
          title: activeProject.title,
          createdAt: activeProject.createdAt,
          updatedAt: now
        },
        snapshot: getProjectSnapshot()
      });
      await apiClient.post(`/api/student/assignments/${submissionCtx.assignmentId}/submit`, {});
      messageApi.success("Работа сохранена и сдана учителю");
      const ctx = await apiClient.get<SubmissionContext>(
        `/api/student/projects/${encodeURIComponent(activeProject.id)}/submission-context`
      );
      setSubmissionCtx(ctx);
    } catch (e) {
      messageApi.error(e instanceof Error ? e.message : "Не удалось сдать");
    } finally {
      setSubmittingAssignment(false);
    }
  };

  return (
    <Content className="app-content">
      {contextHolder}
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        {readOnly ? (
          <Alert
            type="info"
            showIcon
            message="Просмотр работы ученика"
            description={
              <span>
                Сохранение и шаринг отключены.                 Вернись в <Link to="/teacher">кабинет учителя</Link>, чтобы выставить оценку или доработку.
              </span>
            }
          />
        ) : null}
        {!readOnly && submissionCtx ? (
          <Alert
            type={submissionCtx.status === "needs_revision" ? "warning" : "info"}
            showIcon
            message={
              <span>
                Задание: <strong>{submissionCtx.assignmentTitle}</strong> ({submissionCtx.classroomTitle})
              </span>
            }
            description={
              <Space direction="vertical" size="small" style={{ width: "100%" }}>
                {submissionCtx.revisionNote ? (
                  <div>
                    <Text strong>Замечания учителя (доработка):</Text>
                    <Paragraph style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}>
                      {submissionCtx.revisionNote}
                    </Paragraph>
                  </div>
                ) : null}
                {submissionCtx.teacherNote ? (
                  <div>
                    <Text strong>Комментарий учителя:</Text>
                    <Paragraph style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}>
                      {submissionCtx.teacherNote}
                    </Paragraph>
                  </div>
                ) : null}
                {submissionCtx.status === "graded" && submissionCtx.score != null ? (
                  <Text>
                    Оценка: {submissionCtx.score} / {submissionCtx.maxScore}
                  </Text>
                ) : null}
                {submissionCtx.canSubmit ? (
                  <Button type="primary" loading={submittingAssignment} onClick={() => void handleSubmitFromStudio()}>
                    Сохранить в облако и сдать учителю
                  </Button>
                ) : submissionCtx.status === "submitted" ? (
                  <Text type="secondary">Работа сдана, жди проверки.</Text>
                ) : null}
              </Space>
            }
          />
        ) : null}
        <Space wrap align="center" style={{ width: "100%" }}>
          <Text strong style={{ maxWidth: 280 }} ellipsis={{ tooltip: currentProjectTitle }}>
            {currentProjectTitle}
          </Text>
          <Button
            type="primary"
            disabled={readOnly}
            onClick={() => {
              setSaveTitle(currentProjectTitle);
              setSaveOpen(true);
            }}
          >
            Сохранить проект
          </Button>
          <Button onClick={() => setLibraryOpen(true)}>Мои проекты</Button>
          <Button onClick={handleNewProject}>Новый проект</Button>
          {user && activeProject && !readOnly ? (
            <Button
              onClick={() =>
                void (async () => {
                  try {
                    const { token } = await apiClient.post<{ token: string }>(
                      `/api/projects/${activeProject.id}/share-link`,
                      {}
                    );
                    const url = `${window.location.origin}/share/${token}`;
                    await navigator.clipboard.writeText(url);
                    messageApi.success("Ссылка для копии проекта скопирована");
                  } catch {
                    messageApi.error("Не удалось создать ссылку (сохрани проект в облако)");
                  }
                })()
              }
            >
              Поделиться копией
            </Button>
          ) : null}
        </Space>
        <Paragraph className="placeholder-text" style={{ marginBottom: 0 }}>
          MVP Модуль A. Запуск только через блок Старт в Blockly.
        </Paragraph>
        <Tabs
          defaultActiveKey="workspace"
          items={[
            { key: "workspace", label: "Workspace", children: <BlocklyWorkspace /> },
            { key: "library", label: "Библиотека", children: <DataLibrary /> }
          ]}
        />
      </Space>
      <Drawer
        title={`Проекты: ${user?.nickname ?? "Черновик"}`}
        open={libraryOpen}
        width={460}
        onClose={() => setLibraryOpen(false)}
      >
        <List
          dataSource={projectItems}
          locale={{ emptyText: "Проекты не найдены" }}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button key="load" type="link" onClick={() => void handleLoadProject(item.id)}>
                  Загрузить
                </Button>
              ]}
            >
              <List.Item.Meta
                title={item.title}
                description={`Обновлен: ${new Date(item.updatedAt).toLocaleString("ru-RU")}`}
              />
            </List.Item>
          )}
        />
      </Drawer>
      <Modal
        open={saveOpen}
        title="Сохранить проект"
        okText="Сохранить"
        okButtonProps={{ disabled: readOnly }}
        onOk={() => void handleSave()}
        onCancel={() => setSaveOpen(false)}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Input value={saveTitle} onChange={(e) => setSaveTitle(e.target.value)} placeholder="Название проекта" />
        </Space>
      </Modal>
    </Content>
  );
}
