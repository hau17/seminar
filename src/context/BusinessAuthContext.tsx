import React, { createContext, useContext, useState, useEffect } from "react";
import { BusinessUser } from "../types";

interface BusinessAuth {
  business: BusinessUser;
  token: string;
}

interface BusinessAuthContextType {
  auth: BusinessAuth | null;
  isLoading: boolean;
  register: (name: string, email: string, password: string, confirmPassword?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  error: string | null;
  clearError: () => void;
}

const BusinessAuthContext = createContext<BusinessAuthContextType | undefined>(undefined);

export const BusinessAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [auth, setAuth] = useState<BusinessAuth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("business_auth");
      if (saved) setAuth(JSON.parse(saved));
    } catch {
      localStorage.removeItem("business_auth");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = async (name: string, email: string, password: string, confirmPassword?: string) => {
    setIsLoading(true);
    setError(null);
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
      // Register does NOT auto-login per PRD BR-20
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Đăng ký thất bại";
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/business/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Đăng nhập thất bại");
      }
      const { token, business } = await res.json();
      const authData: BusinessAuth = { business, token };
      setAuth(authData);
      localStorage.setItem("business_auth", JSON.stringify(authData));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Đăng nhập thất bại";
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setAuth(null);
    localStorage.removeItem("business_auth");
    setError(null);
  };

  const clearError = () => setError(null);

  return (
    <BusinessAuthContext.Provider value={{ auth, isLoading, register, login, logout, error, clearError }}>
      {children}
    </BusinessAuthContext.Provider>
  );
};

export const useBusinessAuth = () => {
  const ctx = useContext(BusinessAuthContext);
  if (!ctx) throw new Error("useBusinessAuth must be used within BusinessAuthProvider");
  return ctx;
};
