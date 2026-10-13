import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, SESSION_MAX_AGE, decodeSession, encodeSession, type SessionData } from "./session-token";

export type { SessionData };

export async function getSession(): Promise<SessionData | null> {
  return decodeSession((await cookies()).get(SESSION_COOKIE)?.value, false);
}

export async function createSession(uid: string, peran: SessionData["peran"]) {
  const token = encodeSession({ uid, peran, exp: Date.now() + SESSION_MAX_AGE * 1000 });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function deleteSession() {
  (await cookies()).delete(SESSION_COOKIE);
}
