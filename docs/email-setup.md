# Настройка почты (регистрация и сброс пароля)

## Resend (рекомендуется для старта)

1. Зарегистрируйся на [resend.com](https://resend.com), создай API key.
2. В `.env`: `EMAIL_PROVIDER=resend`, `RESEND_API_KEY=...`, `EMAIL_FROM="Noda <onboarding@resend.dev>"` (тестовый отправитель Resend).
3. Для продакшена добавь и верифицируй свой домен в Resend и укажи `EMAIL_FROM` с адресом на этом домене.
4. `APP_BASE_URL` должен совпадать с URL фронта (для ссылки «сброс пароля»).

## SMTP (например Brevo)

1. В кабинете Brevo создай SMTP-ключ.
2. В `.env`: `EMAIL_PROVIDER=smtp`, заполни `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`.

## Локальная разработка без провайдера

- `EMAIL_DEV_LOG=true` — код регистрации и ссылка сброса выводятся в **консоль сервера** (`npm run dev:server`), письма не уходят.

## Миграции

После `git pull` выполни:

```bash
npx prisma migrate deploy
```

(или `npx prisma migrate dev` в разработке.)
