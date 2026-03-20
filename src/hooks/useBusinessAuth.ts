// ✅ v1.5 Business Authentication Hook
import { useState, useEffect } from "react";
import type { BusinessUser, BusinessAuthState } from "../types";

export function useBusinessAuth(): BusinessAuthState & {
  register: (
    email: string,
    password: string,
    company_name: string,
    phone?: string,
  ) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
} {
  const [state, setState] = useState<BusinessAuthState>({
    business: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  // Initialize from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("business_token");
    const storedBusiness = localStorage.getItem("business_user");

    if (storedToken && storedBusiness) {
      try {
        const business = JSON.parse(storedBusiness);
        setState({
          business,
          token: storedToken,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } catch (err) {
        console.error("Failed to parse stored business user:", err);
        localStorage.removeItem("business_token");
        localStorage.removeItem("business_user");
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    } else {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  const register = async (
    email: string,
    password: string,
    company_name: string,
    phone?: string,
  ) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch("/api/businesses/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          company_name,
          phone,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Đăng ký thất bại");
      }

      const data = await response.json();

      const business: BusinessUser = {
        id: data.business_id,
        company_name: data.company_name,
        email: data.email,
        status: "Active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      localStorage.setItem("business_token", data.token);
      localStorage.setItem("business_user", JSON.stringify(business));

      setState({
        business,
        token: data.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Lỗi đăng ký";
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
    }
  };

  const login = async (email: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch("/api/businesses/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Đăng nhập thất bại");
      }

      const data = await response.json();

      const business: BusinessUser = {
        id: data.business_id,
        company_name: data.company_name,
        email: data.email,
        status: "Active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      localStorage.setItem("business_token", data.token);
      localStorage.setItem("business_user", JSON.stringify(business));

      setState({
        business,
        token: data.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Lỗi đăng nhập";
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
    }
  };

  const logout = () => {
    localStorage.removeItem("business_token");
    localStorage.removeItem("business_user");
    setState({
      business: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  };

  return {
    ...state,
    register,
    login,
    logout,
    clearError: () => setState((prev) => ({ ...prev, error: null })),
  };
}
