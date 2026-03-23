import { useState, useEffect } from "react";
import { AdminUser } from "../types";

interface AuthState {
  isLoggedIn: boolean;
  token: string | null;
  admin: AdminUser | null;
  error: string | null;
  loading: boolean;
}

export const useAuth = () => {
  const [auth, setAuth] = useState<AuthState>({
    isLoggedIn: false,
    token: null,
    admin: null,
    error: null,
    loading: false,
  });

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    const adminRaw = localStorage.getItem("adminUser");
    if (token) {
      const admin = adminRaw ? (JSON.parse(adminRaw) as AdminUser) : null;
      setAuth((prev) => ({ ...prev, isLoggedIn: true, token, admin }));
    }
  }, []);

  const login = async (email: string, password: string) => {
    setAuth((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch("/api/auth/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || "Sai email hoặc mật khẩu");
      }

      const { token, admin } = await res.json();
      localStorage.setItem("adminToken", token);
      localStorage.setItem("adminUser", JSON.stringify(admin));
      setAuth({ isLoggedIn: true, token, admin, error: null, loading: false });
    } catch (err) {
      setAuth((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Lỗi đăng nhập",
        loading: false,
      }));
    }
  };

  const logout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    setAuth({ isLoggedIn: false, token: null, admin: null, error: null, loading: false });
  };

  return { ...auth, login, logout };
};
