import { useState, useEffect } from "react";

interface AuthState {
  isLoggedIn: boolean;
  token: string | null;
  error: string | null;
  loading: boolean;
}

export const useAuth = () => {
  const [auth, setAuth] = useState<AuthState>({
    isLoggedIn: false,
    token: localStorage.getItem("authToken"),
    error: null,
    loading: false,
  });

  useEffect(() => {
    // Check if token exists on mount
    const token = localStorage.getItem("authToken");
    if (token) {
      setAuth((prev) => ({ ...prev, isLoggedIn: true, token }));
    }
  }, []);

  const login = async (email: string, password: string) => {
    setAuth((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || "Sai email hoặc mật khẩu");
      }

      const { token } = await res.json();
      localStorage.setItem("authToken", token);
      setAuth({ isLoggedIn: true, token, error: null, loading: false });
    } catch (err) {
      setAuth((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Lỗi đăng nhập",
        loading: false,
      }));
    }
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    setAuth({ isLoggedIn: false, token: null, error: null, loading: false });
  };

  return { ...auth, login, logout };
};
