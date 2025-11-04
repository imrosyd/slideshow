import { createHash, timingSafeEqual } from "crypto";
import type { NextApiRequest } from "next";
import { ADMIN_AUTH_COOKIE_NAME } from "./constants";

const ADMIN_TOKEN_SALT = process.env.ADMIN_PASSWORD_SALT || "slideshow-admin-salt";

const cachedTokenKey = Symbol.for("adminTokenCache");

type TokenCache = {
  expectedToken: string | null;
};

const globalCache = globalThis as typeof globalThis & { [cachedTokenKey]?: TokenCache };

const getCache = (): TokenCache => {
  if (!globalCache[cachedTokenKey]) {
    globalCache[cachedTokenKey] = { expectedToken: null };
  }
  return globalCache[cachedTokenKey]!;
};

export const getAdminAuthCookieName = () => ADMIN_AUTH_COOKIE_NAME;

export const getExpectedAdminToken = (adminPassword: string | null | undefined) => {
  if (!adminPassword) {
    throw new Error("ADMIN_PASSWORD is not configured.");
  }

  const cache = getCache();
  if (cache.expectedToken) {
    return cache.expectedToken;
  }

  const token = createHash("sha256")
    .update(`${adminPassword}:${ADMIN_TOKEN_SALT}`)
    .digest("hex");

  cache.expectedToken = token;
  return token;
};

const safeCompare = (a: string, b: string) => {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) {
    return false;
  }
  return timingSafeEqual(bufferA, bufferB);
};

export const extractAuthHeader = (req: NextApiRequest) => {
  const header = req.headers.authorization;
  if (!header) {
    return null;
  }

  const [scheme, value] = header.split(" ");
  if (!scheme || !value) {
    return null;
  }

  if (scheme === "Bearer") {
    return { type: "password" as const, value };
  }

  if (scheme === "Token") {
    return { type: "token" as const, value };
  }

  return null;
};

export const isAuthorizedAdminRequest = (req: NextApiRequest): boolean => {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return false;
  }

  const expectedToken = getExpectedAdminToken(adminPassword);
  const header = extractAuthHeader(req);

  if (!header) {
    const cookieToken = (req.cookies || {})[ADMIN_AUTH_COOKIE_NAME];
    if (typeof cookieToken === "string" && safeCompare(cookieToken, expectedToken)) {
      return true;
    }
    return false;
  }

  if (header.type === "password") {
    return safeCompare(header.value, adminPassword);
  }

  if (header.type === "token") {
    return safeCompare(header.value, expectedToken);
  }

  return false;
};
