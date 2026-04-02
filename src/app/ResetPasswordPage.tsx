import { useState } from "react";
import { Button, Card, Input, Space, Typography, message } from "antd";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useSessionStore } from "@/store/useSessionStore";

const { Paragraph, Title } = Typography;

export function ResetPasswordPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();
  const { resetPassword } = useSessionStore();
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (password.length < 8) {
      messageApi.error("Пароль не короче 8 символов");
      return;
    }
    if (password !== password2) {
      messageApi.error("Пароли не совпадают");
      return;
    }
    if (!token) {
      messageApi.error("Нет токена в ссылке");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, password);
      messageApi.success("Пароль обновлён. Войдите с новым паролем.");
      navigate("/", { replace: true });
    } catch (e) {
      messageApi.error(e instanceof Error ? e.message : "Не удалось сбросить пароль");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-content" style={{ maxWidth: 420, margin: "48px auto" }}>
      {contextHolder}
      <Card>
        <Title level={4} style={{ marginTop: 0 }}>
          Новый пароль
        </Title>
        {!token ? (
          <Paragraph type="danger">Ссылка неверная: нет токена. Запросите сброс пароля снова.</Paragraph>
        ) : (
          <Paragraph type="secondary">Введите новый пароль для аккаунта.</Paragraph>
        )}
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Input.Password
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Новый пароль"
            disabled={!token}
          />
          <Input.Password
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            placeholder="Повторите пароль"
            disabled={!token}
          />
          <Button type="primary" block loading={loading} disabled={!token} onClick={() => void handleSubmit()}>
            Сохранить пароль
          </Button>
          <Link to="/">
            <Button type="link" block>
              На главную
            </Button>
          </Link>
        </Space>
      </Card>
    </div>
  );
}
