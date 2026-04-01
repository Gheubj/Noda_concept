import dotenv from "dotenv";

dotenv.config();

const isProd = process.env.NODE_ENV === "production";
const cookieSameSiteRaw = (process.env.COOKIE_SAMESITE ?? (isProd ? "none" : "lax")).toLowerCase();
const cookieSameSite =
  cookieSameSiteRaw === "none" || cookieSameSiteRaw === "strict" || cookieSameSiteRaw === "lax"
    ? cookieSameSiteRaw
    : "lax";

export const config = {
  port: Number(process.env.PORT ?? 3001),
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? "dev_access_secret_change_me",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? "dev_refresh_secret_change_me",
  accessTokenTtlSec: Number(process.env.JWT_ACCESS_TTL_SEC ?? 60 * 15),
  refreshTokenTtlSec: Number(process.env.JWT_REFRESH_TTL_SEC ?? 60 * 60 * 24 * 30),
  yandexClientId: process.env.YANDEX_CLIENT_ID ?? "",
  yandexClientSecret: process.env.YANDEX_CLIENT_SECRET ?? "",
  yandexRedirectUri: process.env.YANDEX_REDIRECT_URI ?? "http://localhost:3001/api/auth/yandex/callback",
  appBaseUrl: process.env.APP_BASE_URL ?? "http://localhost:5173",
  /** Cross-origin SPA + API: SameSite=None и Secure нужны, чтобы refresh-cookie уходил с fetch. */
  cookieSecure: process.env.COOKIE_SECURE === "true" || cookieSameSite === "none" || isProd,
  cookieSameSite: cookieSameSite as "lax" | "strict" | "none"
};
