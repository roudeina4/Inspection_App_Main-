import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { User, UserRole } from "@shared/schema";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: UserRole) => Promise<void>;
  logout: () => void;
  setDemoUser: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Get auth headers for API requests
export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("jwt_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("jwt_token");
    if (storedToken) {
      setToken(storedToken);
    }
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const storedToken = localStorage.getItem("jwt_token");
      const headers: Record<string, string> = {};
      if (storedToken) {
        headers["Authorization"] = `Bearer ${storedToken}`;
      }
      const res = await fetch("/api/auth/me", { 
        credentials: "include",
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        localStorage.removeItem("jwt_token");
        setToken(null);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      localStorage.removeItem("jwt_token");
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Login failed");
    }
    const data = await res.json();
    setUser(data.user);
    if (data.token) {
      localStorage.setItem("jwt_token", data.token);
      setToken(data.token);
    }
  };

  const register = async (name: string, email: string, password: string, role?: UserRole) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, email, password, role }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Registration failed");
    }
    const data = await res.json();
    setUser(data.user);
    if (data.token) {
      localStorage.setItem("jwt_token", data.token);
      setToken(data.token);
    }
  };

  const logout = () => {
    fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    localStorage.removeItem("jwt_token");
    setUser(null);
    setToken(null);
  };

  const setDemoUser = async (role: UserRole) => {
    const demoCredentials: Record<UserRole, { email: string; password: string }> = {
      ADMIN: { email: "admin@tba.com", password: "password123" },
      PM: { email: "hadil@tba.com", password: "password123" },
      CLEANER: { email: "cleaner@tba.com", password: "password123" },
      INSPECTOR: { email: "inspector@tba.com", password: "password123" },
      OWNER: { email: "owner@tba.com", password: "password123" },
    };
    const creds = demoCredentials[role];
    await login(creds.email, creds.password);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, token, login, register, logout, setDemoUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
