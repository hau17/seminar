// Business Auth Hook — aligns with PRD v1.6 DB schema
import { useState, useEffect } from "react";
import type { BusinessUser, BusinessAuthState } from "../types";

interface BusinessAuthHook extends BusinessAuthState {
  register: (name: string, email: string, password: string, confirmPassword?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

export function useBusinessAuth(): BusinessAuthHook {
  const [state, setState] = useState<BusinessAuthState>({
    business: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const storedToken = localStorage.getItem("business_token");
    const storedBusiness = localStorage.getItem("business_user");

    if (storedToken && storedBusiness) {
      try {
        const business = JSON.parse(storedBusiness) as BusinessUser;
        setState({ business, token: storedToken, isAuthenticated: true, isLoading: false, error: null });
      } catch {
        localStorage.removeItem("business_token");
        localStorage.removeItem("business_user");
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    } else {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  const register = async (name: string, email: string, password: string, confirmPassword?: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const res = await fetch("/api/auth/business/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, confirm_password: confirmPassword }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Đăng ký thất bại");
      }
      setState((prev) => ({ ...prev, isLoading: false }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Đăng ký thất bại";
      setState((prev) => ({ ...prev, isLoading: false, error: message }));
    }
  };

  const login = async (email: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const res = await fetch("http://localhost:3000/api/businesses/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Đăng nhập thất bại");
      }
      const data = await res.json();
      const business: BusinessUser = {
        id: data.business.id,
        name: data.business.name,
        email: data.business.email,
      };
      localStorage.setItem("business_token", data.token);
      localStorage.setItem("business_user", JSON.stringify(business));
      setState({ business, token: data.token, isAuthenticated: true, isLoading: false, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Đăng nhập thất bại";
      setState((prev) => ({ ...prev, isLoading: false, error: message }));
    }
  };

  const logout = () => {
    localStorage.removeItem("business_token");
    localStorage.removeItem("business_user");
    setState({ business: null, token: null, isAuthenticated: false, isLoading: false, error: null });
  };

  const clearError = () => setState((prev) => ({ ...prev, error: null }));

  return { ...state, register, login, logout, clearError };
}
