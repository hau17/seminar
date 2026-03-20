import React, { createContext, useContext, useState, useEffect } from "react";

interface BusinessAuth {
  businessId: number;
  businessToken: string;
  companyName: string;
  email: string;
}

interface BusinessAuthContextType {
  auth: BusinessAuth | null;
  isLoading: boolean;
  register: (
    companyName: string,
    email: string,
    password: string,
    phone?: string,
  ) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  error: string | null;
  clearError: () => void;
}

const BusinessAuthContext = createContext<BusinessAuthContextType | undefined>(
  undefined,
);

export const BusinessAuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [auth, setAuth] = useState<BusinessAuth | null>(null);
  // ✅ CRITICAL FIX: Start with isLoading=true to prevent guard from redirecting
  // while localStorage is being checked. Set to false once check completes.
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Load token from localStorage on mount (restore session)
  useEffect(() => {
    try {
      const savedAuth = localStorage.getItem("business_auth");
      if (savedAuth) {
        setAuth(JSON.parse(savedAuth));
      }
    } catch (e) {
      console.warn("Failed to restore auth session");
      localStorage.removeItem("business_auth");
    } finally {
      // ✅ Always set isLoading=false after localStorage check (success or fail)
      setIsLoading(false);
    }
  }, []);

  const register = async (
    companyName: string,
    email: string,
    password: string,
    phone?: string,
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/businesses/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: companyName,
          email,
          password,
          phone: phone || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Registration failed (${response.status})`,
        );
      }

      const data = await response.json();
      const authData: BusinessAuth = {
        businessId: data.business_id,
        businessToken: data.business_token || data.token,
        companyName: data.company_name,
        email: data.email,
      };

      setAuth(authData);
      localStorage.setItem("business_auth", JSON.stringify(authData));
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Registration failed";
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/businesses/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Login failed (${response.status})`);
      }

      const data = await response.json();
      const authData: BusinessAuth = {
        businessId: data.business_id,
        businessToken: data.business_token || data.token,
        companyName: data.company_name,
        email: data.email,
      };

      setAuth(authData);
      localStorage.setItem("business_auth", JSON.stringify(authData));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Login failed";
      setError(errorMsg);
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
    <BusinessAuthContext.Provider
      value={{
        auth,
        isLoading,
        register,
        login,
        logout,
        error,
        clearError,
      }}
    >
      {children}
    </BusinessAuthContext.Provider>
  );
};

export const useBusinessAuth = () => {
  const context = useContext(BusinessAuthContext);
  if (!context) {
    throw new Error("useBusinessAuth must be used within BusinessAuthProvider");
  }
  return context;
};
