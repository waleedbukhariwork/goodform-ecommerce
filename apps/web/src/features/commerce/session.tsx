"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type AccountUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
};

type SessionState = {
  user: AccountUser | null;
  loading: boolean;
  refresh: () => Promise<AccountUser | null>;
  replaceUser: (user: AccountUser | null) => void;
};

const SessionContext = createContext<SessionState | null>(null);

function asUser(value: unknown): AccountUser | null {
  if (!value || typeof value !== "object") return null;
  const user = (value as { user?: unknown }).user;
  if (!user || typeof user !== "object") return null;
  const record = user as Record<string, unknown>;
  if (typeof record.name !== "string" || typeof record.email !== "string")
    return null;
  if (typeof record.id !== "string") return null;
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    emailVerified: record.emailVerified === true,
  };
}

async function readSession(): Promise<AccountUser | null> {
  const response = await fetch("/api/auth/get-session", {
    cache: "no-store",
    credentials: "same-origin",
  });
  if (!response.ok) return null;
  const body: unknown = await response.json().catch(() => null);
  return asUser(body);
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try {
      const next = await readSession();
      setUser(next);
      return next;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <SessionContext.Provider
      value={{ user, loading, refresh, replaceUser: setUser }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("SessionProvider is missing");
  return value;
}
