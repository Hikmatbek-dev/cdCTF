import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useLocation } from "wouter";

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

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("cdctf_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    let cancelled = false;

    fetch("/api/auth/session")
      .then(response => response.ok ? response.json() : { user: null })
      .then((session: { user: User | null }) => {
        if (cancelled) return;
        if (session.user) {
          setUser(session.user);
          localStorage.setItem("cdctf_user", JSON.stringify(session.user));
        } else {
          setUser(null);
          localStorage.removeItem("cdctf_user");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null);
          localStorage.removeItem("cdctf_user");
        }
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
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem("cdctf_user", JSON.stringify(updatedUser));
  };

  const logout = () => {
    void fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    setUser(null);
    setToken(null);
    localStorage.removeItem("cdctf_user");
    localStorage.removeItem("cdctf_token");
    setLocation("/");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        updateUser,
        isAuthenticated: !!user,
        isAdmin: user?.role === "admin",
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
