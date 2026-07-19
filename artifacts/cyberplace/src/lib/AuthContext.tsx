import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";

export interface User {
  id: number;
  nickname: string;
  email: string;
  avatarUrl?: string | null;
  points: number;
  role: string;
  emailVerified: boolean;
  isBlocked: boolean;
  createdAt: string;
}

interface SessionResponse {
  user: User | null;
  permissions?: string[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  /** True until the session check has answered. Guards must wait for it. */
  isLoading: boolean;
  permissions: string[];
  can: (permission: string) => boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  /** Anyone who may see the admin panel at all: author, moderator or admin. */
  isStaff: boolean;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("cdctf_user");
    return saved ? JSON.parse(saved) : null;
  });
  // Permissions are never cached: they are authorisation, and localStorage is
  // writable by the page. The server sends them with every session check.
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;

    fetch("/api/auth/session", { credentials: "include" })
      .then(response => response.ok ? response.json() : { user: null })
      .then((session: SessionResponse) => {
        if (cancelled) return;
        if (session.user) {
          // The server decides who scores (users.excludedFromScoring) and sends
          // the points already zeroed. A second rule here, keyed off a nickname,
          // was one rename away from disagreeing with it.
          setUser(session.user);
          setPermissions(session.permissions ?? []);
          localStorage.setItem("cdctf_user", JSON.stringify(session.user));
        } else {
          setUser(null);
          setPermissions([]);
          localStorage.removeItem("cdctf_user");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null);
          setPermissions([]);
          localStorage.removeItem("cdctf_user");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = (newUser: User, newToken: string) => {
    setUser(newUser);
    setToken(newToken || null);
    localStorage.setItem("cdctf_user", JSON.stringify(newUser));
    localStorage.removeItem("cdctf_token");
    // Permissions arrive with the next session check; refetch it now so staff
    // navigation appears without a reload.
    void fetch("/api/auth/session", { credentials: "include" })
      .then(response => response.ok ? response.json() : { user: null })
      .then((session: SessionResponse) => setPermissions(session.permissions ?? []))
      .catch(() => undefined);
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem("cdctf_user", JSON.stringify(updatedUser));
  };

  const logout = () => {
    void fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => undefined);
    setUser(null);
    setToken(null);
    setPermissions([]);
    localStorage.removeItem("cdctf_user");
    localStorage.removeItem("cdctf_token");
    // Without this the next user to sign in on this browser inherits the cached
    // profile, dashboard and admin data of the last one.
    queryClient.clear();
    setLocation("/");
  };

  const can = (permission: string) => permissions.includes(permission);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        permissions,
        can,
        login,
        logout,
        updateUser,
        isAuthenticated: !!user,
        isAdmin: user?.role === "admin",
        isStaff: can("admin.panel"),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
