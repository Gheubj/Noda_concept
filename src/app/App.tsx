import { useEffect, useLayoutEffect, useState } from "react";
import {
  Button,
  Drawer,
  Input,
  Layout,
  List,
  Modal,
  Select,
  Space,
  Tabs,
  Typography,
  message
} from "antd";
import { UserOutlined } from "@ant-design/icons";
import { Link, Route, Routes } from "react-router-dom";
import { BlocklyWorkspace } from "@/features/blockly/BlocklyWorkspace";
import { DataLibrary } from "@/features/data/DataLibrary";
import { AccountPage } from "@/app/AccountPage";
import { ResetPasswordPage } from "@/app/ResetPasswordPage";
import { useAppStore } from "@/store/useAppStore";
import type { NodaProjectMeta } from "@/shared/types/project";
import { loadProjectSmart, listProjects, saveProjectSmart } from "@/features/project/projectRepository";
import { useSessionStore } from "@/store/useSessionStore";
import { setAccessToken } from "@/shared/api/client";

const { Header, Content } = Layout;
const { Title, Paragraph } = Typography;
const GUEST_USER_ID_KEY = "noda_guest_user_id";
const DEFAULT_PROJECT_TITLE = "Новый проект";

function WorkspaceHome() {
  return (
    <>
      <Paragraph className="placeholder-text">
        MVP Модуль A. Запуск только через блок Старт в Blockly.
      </Paragraph>
      <Tabs
        defaultActiveKey="workspace"
        items={[
          {
            key: "workspace",
            label: "Workspace",
            children: <BlocklyWorkspace />
          },
          {
            key: "library",
            label: "Библиотека",
            children: <DataLibrary />
          }
        ]}
      />
    </>
  );
}

export function App() {
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
  const [authOpen, setAuthOpen] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"teacher" | "student">("student");
  const [studentMode, setStudentMode] = useState<"school" | "direct">("direct");
  const [nickname, setNickname] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [yandexModalOpen, setYandexModalOpen] = useState(false);
  const [yandexRole, setYandexRole] = useState<"teacher" | "student">("student");
  const [yandexStudentMode, setYandexStudentMode] = useState<"school" | "direct">("direct");
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState(DEFAULT_PROJECT_TITLE);
  const [projectItems, setProjectItems] = useState<NodaProjectMeta[]>([]);
  const { getProjectSnapshot, loadProjectSnapshot, activeProject, setActiveProject } = useAppStore();
  const { user, register, login, requestRegistrationCode, requestForgotPassword } = useSessionStore();
  const resolvedUserId = user?.id ?? guestUserId;
  const currentProjectTitle = activeProject?.title ?? DEFAULT_PROJECT_TITLE;

  const refreshProjects = async (nextUserId: string) => {
    const list = await listProjects(nextUserId.trim());
    setProjectItems(list);
  };

  useLayoutEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("access_token")) {
      return;
    }
    const token = url.searchParams.get("access_token");
    if (token) {
      setAccessToken(token);
    }
    url.searchParams.delete("access_token");
    const qs = url.searchParams.toString();
    window.history.replaceState({}, "", `${url.pathname}${qs ? `?${qs}` : ""}${url.hash}`);
  }, []);

  useEffect(() => {
    void useSessionStore.getState().restoreSession();
  }, []);

  useEffect(() => {
    void refreshProjects(resolvedUserId);
  }, [resolvedUserId]);

  const handleSave = async () => {
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

  const handleSendRegistrationCode = async () => {
    const normalized = email.trim();
    if (!normalized) {
      messageApi.error("Укажи email");
      return;
    }
    try {
      await requestRegistrationCode(normalized);
      messageApi.success("Код отправлен на почту");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "Не удалось отправить код");
    }
  };

  const handleAuth = async () => {
    try {
      if (isRegister) {
        await register({
          email,
          password,
          verificationCode: verificationCode.trim(),
          nickname,
          role,
          studentMode
        });
      } else {
        await login(email, password);
      }
      setAuthOpen(false);
      setVerificationCode("");
      messageApi.success(isRegister ? "Регистрация выполнена" : "Вход выполнен");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "Ошибка авторизации");
    }
  };

  const handleForgotSubmit = async () => {
    const normalized = forgotEmail.trim() || email.trim();
    if (!normalized) {
      messageApi.error("Укажи email");
      return;
    }
    try {
      await requestForgotPassword(normalized);
      messageApi.success("Если аккаунт есть, письмо отправлено");
      setForgotOpen(false);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "Ошибка запроса");
    }
  };

  const handleYandexContinue = () => {
    const api = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";
    const params = new URLSearchParams({
      role: yandexRole,
      studentMode: yandexRole === "teacher" ? "direct" : yandexStudentMode
    });
    window.location.href = `${api}/api/auth/yandex/start?${params.toString()}`;
  };

  return (
    <Layout className="app-layout">
      {contextHolder}
      <Header className={`app-header${user ? " app-header--authed" : ""}`}>
        <Title level={3} className="app-title">
          <Link to="/" className="app-title-link">
            Noda PoC - AI в браузере
          </Link>
        </Title>
        <Space className="header-actions">
          {!user ? (
            <>
              <Button type="primary" onClick={() => setAuthOpen(true)}>
                Войти / Регистрация
              </Button>
              <Button onClick={() => setYandexModalOpen(true)}>Войти через Яндекс</Button>
            </>
          ) : null}
          <Button type="default" className="header-input">
            {user ? `Ник: ${user.nickname}` : "Гость"}
          </Button>
          <Button type="default" className="header-input">
            {currentProjectTitle}
          </Button>
          <Button
            type="primary"
            onClick={() => {
              setSaveTitle(currentProjectTitle);
              setSaveOpen(true);
            }}
          >
            Сохранить проект
          </Button>
          <Button onClick={() => setLibraryOpen(true)}>Библиотека проектов</Button>
        </Space>
        {user ? (
          <Link to="/account" className="app-header-account" aria-label="Личный кабинет">
            <Button
              type="text"
              size="large"
              icon={<UserOutlined className="app-header-account-icon" />}
              className="header-user-btn app-header-account-btn"
            />
          </Link>
        ) : null}
      </Header>
      <Routes>
        <Route
          path="/"
          element={
            <Content className="app-content">
              <WorkspaceHome />
            </Content>
          }
        />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Routes>
      <Drawer
        title={`Проекты: ${user?.nickname ?? "Гость"}`}
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
        open={authOpen}
        title={isRegister ? "Регистрация" : "Вход"}
        onCancel={() => {
          setAuthOpen(false);
          setVerificationCode("");
        }}
        onOk={() => void handleAuth()}
        okText={isRegister ? "Создать аккаунт" : "Войти"}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
          {isRegister ? (
            <Space.Compact style={{ width: "100%" }}>
              <Button onClick={() => void handleSendRegistrationCode()}>Отправить код</Button>
            </Space.Compact>
          ) : null}
          <Input.Password
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Пароль"
          />
          {isRegister ? (
            <>
              <Input
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Код из письма (6 цифр)"
                maxLength={6}
              />
              <Input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Ник (уникальный)"
              />
              <Select
                value={role}
                onChange={(v) => setRole(v)}
                options={[
                  { value: "student", label: "Ученик" },
                  { value: "teacher", label: "Учитель" }
                ]}
              />
              <Select
                value={studentMode}
                onChange={(v) => setStudentMode(v)}
                options={[
                  { value: "direct", label: "Ученик без учителя" },
                  { value: "school", label: "Ученик школы" }
                ]}
                disabled={role !== "student"}
              />
            </>
          ) : (
            <Button
              type="link"
              style={{ padding: 0 }}
              onClick={() => {
                setForgotEmail(email);
                setForgotOpen(true);
              }}
            >
              Забыли пароль?
            </Button>
          )}
          <Button
            type="link"
            onClick={() => {
              setIsRegister((v) => !v);
              setVerificationCode("");
            }}
          >
            {isRegister ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Зарегистрироваться"}
          </Button>
        </Space>
      </Modal>
      <Modal
        open={yandexModalOpen}
        title="Вход через Яндекс"
        okText="Продолжить в Яндексе"
        onCancel={() => setYandexModalOpen(false)}
        onOk={() => handleYandexContinue()}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Выбери роль для нового аккаунта. У уже существующего пользователя роль не меняется.
          </Paragraph>
          <Select
            value={yandexRole}
            onChange={(v) => setYandexRole(v)}
            style={{ width: "100%" }}
            options={[
              { value: "student", label: "Ученик" },
              { value: "teacher", label: "Учитель" }
            ]}
          />
          <Select
            value={yandexStudentMode}
            onChange={(v) => setYandexStudentMode(v)}
            style={{ width: "100%" }}
            options={[
              { value: "direct", label: "Ученик без учителя" },
              { value: "school", label: "Ученик школы" }
            ]}
            disabled={yandexRole !== "student"}
          />
        </Space>
      </Modal>
      <Modal
        open={forgotOpen}
        title="Сброс пароля"
        okText="Отправить ссылку"
        onCancel={() => setForgotOpen(false)}
        onOk={() => void handleForgotSubmit()}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Input
            value={forgotEmail}
            onChange={(e) => setForgotEmail(e.target.value)}
            placeholder="Email аккаунта"
          />
        </Space>
      </Modal>
      <Modal
        open={saveOpen}
        title="Сохранить проект"
        okText="Сохранить"
        onOk={() => void handleSave()}
        onCancel={() => setSaveOpen(false)}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Input value={saveTitle} onChange={(e) => setSaveTitle(e.target.value)} placeholder="Название проекта" />
        </Space>
      </Modal>
    </Layout>
  );
}
