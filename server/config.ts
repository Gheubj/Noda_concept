import dotenv from "dotenv";

dotenv.config();

/** Origin как в заголовке браузера: схема + хост + порт, без path и без завершающего `/`. */
export function normalizeBrowserOrigin(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, "");
  if (!trimmed) {
    return "";
  }
  try {
    const u = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    return `${u.protocol}//${u.host}`;
  } catch {
    return trimmed;
  }
}

/** Вариант с www / без www для одного домена (localhost не трогаем). */
function expandWwwVariants(origin: string): string[] {
  const out = [origin];
  try {
    const u = new URL(origin);
    const h = u.hostname;
    const port = u.port ? `:${u.port}` : "";
    const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(h);
    if (h.startsWith("www.")) {
      out.push(`${u.protocol}//${h.slice(4)}${port}`);
    } else if (!isIp && h.includes(".") && !h.startsWith("www.") && h !== "localhost") {
      out.push(`${u.protocol}//www.${h}${port}`);
    }
  } catch {
    /* ignore */
  }
  return [...new Set(out)];
}

function buildCorsAllowedOrigins(): Set<string> {
  const set = new Set<string>();
  const extras = (process.env.CORS_ADDITIONAL_ORIGINS?.split(",") ?? [])
    .map((s) => s.trim())
    .filter(Boolean);
  const seeds = [process.env.APP_BASE_URL ?? "http://localhost:5173", ...extras];
  for (const raw of seeds) {
    const base = normalizeBrowserOrigin(raw);
    if (!base) {
      continue;
    }
    for (const o of expandWwwVariants(base)) {
      set.add(o);
    }
  }
  return set;
}

function safePositiveInt(raw: string | undefined, fallback: number): number {
  const n = Number(raw?.trim() === "" ? undefined : raw);
  if (!Number.isFinite(n) || n <= 0) {
    return fallback;
  }
  return Math.floor(n);
}

const isProd = process.env.NODE_ENV === "production";
const cookieSameSiteRaw = (process.env.COOKIE_SAMESITE ?? (isProd ? "none" : "lax")).toLowerCase();
const cookieSameSite =
  cookieSameSiteRaw === "none" || cookieSameSiteRaw === "strict" || cookieSameSiteRaw === "lax"
    ? cookieSameSiteRaw
    : "lax";

const emailProviderRaw = (process.env.EMAIL_PROVIDER ?? "resend").toLowerCase();
const emailProvider = emailProviderRaw === "smtp" ? "smtp" : "resend";

const DEV_ACCESS_SECRET_FALLBACK = "dev_access_secret_change_me";
const DEV_REFRESH_SECRET_FALLBACK = "dev_refresh_secret_change_me";

function requireSecret(envName: string, devFallback: string): string {
  const raw = process.env[envName];
  if (raw && raw.length >= 16 && raw !== devFallback) {
    return raw;
  }
  if (isProd) {
    throw new Error(
      `[config] ${envName} must be set to a strong value (>=16 chars) in production`
    );
  }
  // В dev допускаем небезопасный дефолт, но явно логируем.
  // eslint-disable-next-line no-console
  console.warn(`[config] ${envName} is not set — using insecure dev fallback`);
  return devFallback;
}

export const config = {
  port: Number(process.env.PORT ?? 3001),
  isProd,
  jwtAccessSecret: requireSecret("JWT_ACCESS_SECRET", DEV_ACCESS_SECRET_FALLBACK),
  jwtRefreshSecret: requireSecret("JWT_REFRESH_SECRET", DEV_REFRESH_SECRET_FALLBACK),
  accessTokenTtlSec: safePositiveInt(process.env.JWT_ACCESS_TTL_SEC, 60 * 15),
  refreshTokenTtlSec: safePositiveInt(process.env.JWT_REFRESH_TTL_SEC, 60 * 60 * 24 * 30),
  yandexClientId: process.env.YANDEX_CLIENT_ID ?? "",
  yandexClientSecret: process.env.YANDEX_CLIENT_SECRET ?? "",
  yandexRedirectUri: (process.env.YANDEX_REDIRECT_URI ?? "http://localhost:3001/api/auth/yandex/callback").trim(),
  /** Без path; для CORS должен совпадать с Origin браузера (в т.ч. без лишнего `/`). */
  appBaseUrl: normalizeBrowserOrigin(process.env.APP_BASE_URL ?? "http://localhost:5173"),
  /** Разрешённые Origin для credentialed fetch (фронт ≠ API). */
  corsAllowedOrigins: buildCorsAllowedOrigins(),
  /** Cross-origin SPA + API: SameSite=None и Secure нужны, чтобы refresh-cookie уходил с fetch. */
  cookieSecure: process.env.COOKIE_SECURE === "true" || cookieSameSite === "none" || isProd,
  cookieSameSite: cookieSameSite as "lax" | "strict" | "none",

  emailProvider,
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  emailFrom: process.env.EMAIL_FROM ?? "Nodly <onboarding@resend.dev>",
  smtpHost: process.env.SMTP_HOST ?? "",
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPass: process.env.SMTP_PASS ?? "",
  smtpSecure: process.env.SMTP_SECURE === "true",

  registrationOtpTtlMin: Number(process.env.REGISTRATION_OTP_TTL_MIN ?? 15),
  passwordResetTtlMin: Number(process.env.PASSWORD_RESET_TTL_MIN ?? 60)
};
