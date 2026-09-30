"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import { usePathname } from "next/navigation";

export type AccountUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
};

type Departure = "idle" | "home-in" | "home-out";

type SessionState = {
  user: AccountUser | null;
  loading: boolean;
  /** Set while sign-in or sign-out is navigating to the collection. */
  departure: Departure;
  refresh: () => Promise<AccountUser | null>;
  replaceUser: (user: AccountUser | null) => void;
  beginRouteHome: (next: Exclude<Departure, "idle">) => void;
  cancelRouteHome: () => void;
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
  const pathname = usePathname();
  const [user, setUser] = useState<AccountUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [departure, setDeparture] = useState<Departure>("idle");
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

  const beginRouteHome = useCallback((next: Exclude<Departure, "idle">) => {
    setDeparture(next);
  }, []);
  const cancelRouteHome = useCallback(() => setDeparture("idle"), []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Clear the signed-in name in the same commit as the collection, before paint,
  // so sign-out does not show the account form and then the home page.
  useLayoutEffect(() => {
    if (pathname !== "/" || departure === "idle") return;
    if (departure === "home-out") setUser(null);
    setDeparture("idle");
  }, [pathname, departure]);

  return (
    <SessionContext.Provider
      value={{
        user,
        loading,
        departure,
        refresh,
        replaceUser: setUser,
        beginRouteHome,
        cancelRouteHome,
      }}
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
