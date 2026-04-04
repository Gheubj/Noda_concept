import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Card,
  Empty,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message
} from "antd";
import { Link } from "react-router-dom";
import { CopyOutlined, TeamOutlined } from "@ant-design/icons";
import { useSessionStore } from "@/store/useSessionStore";
import { apiClient } from "@/shared/api/client";
import type { ColumnsType } from "antd/es/table";

const { Title, Paragraph, Text } = Typography;

interface DashboardSchool {
  id: string;
  name: string;
}

interface DashboardStudent {
  enrollmentId: string;
  joinedAt: string;
  id: string;
  nickname: string;
  email: string;
}

interface DashboardClassroom {
  id: string;
  title: string;
  code: string;
  schoolId: string;
  schoolName: string;
  createdAt: string;
  students: DashboardStudent[];
}

interface TeacherDashboard {
  schools: DashboardSchool[];
  classrooms: DashboardClassroom[];
}

export function TeacherPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const { user } = useSessionStore();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<TeacherDashboard | null>(null);
  const [schoolModalOpen, setSchoolModalOpen] = useState(false);
  const [schoolName, setSchoolName] = useState("");
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [classTitle, setClassTitle] = useState("");
  const [classSchoolId, setClassSchoolId] = useState<string>("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<TeacherDashboard>("/api/teacher/dashboard");
      setDashboard(data);
      setClassSchoolId((prev) => prev || data.schools[0]?.id || "");
    } catch {
      setDashboard(null);
      messageApi.error("Не удалось загрузить данные");
    } finally {
      setLoading(false);
    }
  }, [messageApi]);

  useEffect(() => {
    if (user?.role === "teacher") {
      void loadDashboard();
    }
  }, [user?.role, loadDashboard]);

  const handleCreateSchool = async () => {
    const name = schoolName.trim();
    if (name.length < 2) {
      messageApi.error("Название школы — минимум 2 символа");
      return;
    }
    try {
      await apiClient.post("/api/schools", { name });
      messageApi.success("Школа создана");
      setSchoolModalOpen(false);
      setSchoolName("");
      await loadDashboard();
    } catch (e) {
      messageApi.error(e instanceof Error ? e.message : "Ошибка");
    }
  };

  const handleCreateClass = async () => {
    const title = classTitle.trim();
    if (title.length < 2) {
      messageApi.error("Название класса — минимум 2 символа");
      return;
    }
    if (!classSchoolId) {
      messageApi.error("Сначала создайте школу");
      return;
    }
    try {
      await apiClient.post("/api/classrooms", { schoolId: classSchoolId, title });
      messageApi.success("Класс создан, код для учеников сгенерирован");
      setClassModalOpen(false);
      setClassTitle("");
      await loadDashboard();
    } catch (e) {
      messageApi.error(e instanceof Error ? e.message : "Ошибка");
    }
  };

  const copyCode = (code: string) => {
    void navigator.clipboard.writeText(code);
    messageApi.success("Код скопирован");
  };

  const studentColumns: ColumnsType<DashboardStudent> = [
    { title: "Ник", dataIndex: "nickname", key: "nickname" },
    { title: "Email", dataIndex: "email", key: "email" },
    {
      title: "В классе с",
      dataIndex: "joinedAt",
      key: "joinedAt",
      render: (v: string) => new Date(v).toLocaleString("ru-RU")
    }
  ];

  if (!user) {
    return (
      <div className="app-content account-page">
        <Card>
          <Paragraph>Войдите как учитель.</Paragraph>
          <Link to="/">
            <Button type="primary">На главную</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (user.role !== "teacher") {
    return (
      <div className="app-content account-page">
        <Card>
          <Paragraph>Кабинет учителя доступен только учителям.</Paragraph>
          <Link to="/account">
            <Button type="primary">Личный кабинет</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const classesTab = (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Card size="small" title="Быстрые действия">
        <Space wrap>
          <Button type="primary" onClick={() => setSchoolModalOpen(true)}>
            Новая школа / организация
          </Button>
          <Button
            type="default"
            onClick={() => setClassModalOpen(true)}
            disabled={!dashboard?.schools.length}
          >
            Новый класс
          </Button>
        </Space>
        {!dashboard?.schools.length ? (
          <Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
            Сначала создайте школу (кружок, класс в школе, центр и т.д.) — к ней будут привязаны классы.
          </Paragraph>
        ) : null}
      </Card>

      {loading ? (
        <Text type="secondary">Загрузка…</Text>
      ) : !dashboard?.classrooms.length ? (
        <Empty description="Пока нет классов. Создайте класс и дайте ученикам код из карточки класса." />
      ) : (
        dashboard.classrooms.map((c) => (
          <Card
            key={c.id}
            title={
              <Space wrap>
                <TeamOutlined />
                <span>{c.title}</span>
                <Text type="secondary">({c.schoolName})</Text>
              </Space>
            }
            extra={
              <Space>
                <Text type="secondary">Код для входа учеников:</Text>
                <Tag style={{ fontFamily: "monospace", fontSize: 14 }} color="blue">
                  {c.code}
                </Tag>
                <Button size="small" icon={<CopyOutlined />} onClick={() => copyCode(c.code)}>
                  Копировать
                </Button>
              </Space>
            }
          >
            <Paragraph type="secondary" style={{ marginTop: 0 }}>
              Ученик в личном кабинете (режим «ученик школы») вводит этот код в поле «Код класса».
            </Paragraph>
            <Table<DashboardStudent>
              size="small"
              rowKey="enrollmentId"
              columns={studentColumns}
              dataSource={c.students}
              pagination={false}
              locale={{ emptyText: "В классе пока никого нет" }}
            />
          </Card>
        ))
      )}
    </Space>
  );

  const roadmapTab = (
    <Card>
      <Title level={5}>Куда развивается кабинет учителя</Title>
      <Paragraph>
        По продуктовой концепции Noda здесь со временем появятся модули для школ и кружков: не только
        список классов, но и полноценная работа с группой.
      </Paragraph>
      <ul style={{ paddingLeft: 20, marginBottom: 0 }}>
        <li>
          <Text strong>Успеваемость и журнал</Text> — таблица «ученики × задания», статусы сдачи, средние
          баллы, кто отстаёт.
        </li>
        <li>
          <Text strong>Задания</Text> — выдача ДЗ из библиотеки или свои, дедлайны, рубрики оценки;
          проверка проектов Blockly с комментариями.
        </li>
        <li>
          <Text strong>Готовая программа</Text> — поурочные планы, презентации, заготовки проектов под
          модули А–D (как в методичке продукта).
        </li>
        <li>
          <Text strong>Аналитика</Text> — время в платформе, прогресс по темам, сравнение с классом
          (анонимно).
        </li>
        <li>
          <Text strong>Архив классов</Text>, импорт учеников из таблиц, сертификаты по окончании курса.
        </li>
      </ul>
      <Paragraph type="secondary" style={{ marginTop: 16, marginBottom: 0 }}>
        Сейчас в PoC: создание школы и классов, код приглашения и список подключившихся учеников — база
        для всего остального.
      </Paragraph>
    </Card>
  );

  return (
    <div className="app-content account-page">
      {contextHolder}
      <Space direction="vertical" size="large" style={{ width: "100%", maxWidth: 960 }}>
        <Link to="/studio">
          <Button type="link">← Назад в разработку</Button>
        </Link>
        <Title level={4} style={{ margin: 0 }}>
          Кабинет учителя
        </Title>
        <Tabs
          defaultActiveKey="classes"
          items={[
            { key: "classes", label: "Классы и ученики", children: classesTab },
            { key: "roadmap", label: "Планы развития", children: roadmapTab }
          ]}
        />
      </Space>

      <Modal
        title="Новая школа / организация"
        open={schoolModalOpen}
        okText="Создать"
        onCancel={() => {
          setSchoolModalOpen(false);
          setSchoolName("");
        }}
        onOk={() => void handleCreateSchool()}
      >
        <Paragraph type="secondary">
          Название: школа, филиал, кружок — как вам удобно вести учёт.
        </Paragraph>
        <Input
          placeholder="Например: Гимназия №5, кружок «Нода»"
          value={schoolName}
          onChange={(e) => setSchoolName(e.target.value)}
        />
      </Modal>

      <Modal
        title="Новый класс"
        open={classModalOpen}
        okText="Создать"
        onCancel={() => {
          setClassModalOpen(false);
          setClassTitle("");
        }}
        onOk={() => void handleCreateClass()}
      >
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <div>
            <Text type="secondary">Школа</Text>
            <Select
              style={{ width: "100%", marginTop: 4 }}
              value={classSchoolId || undefined}
              placeholder="Выберите школу"
              options={dashboard?.schools.map((s) => ({ value: s.id, label: s.name })) ?? []}
              onChange={(v) => setClassSchoolId(v)}
            />
          </div>
          <div>
            <Text type="secondary">Название класса</Text>
            <Input
              style={{ marginTop: 4 }}
              placeholder="Например: 7Б информатика, группа суббота"
              value={classTitle}
              onChange={(e) => setClassTitle(e.target.value)}
            />
          </div>
        </Space>
      </Modal>
    </div>
  );
}
