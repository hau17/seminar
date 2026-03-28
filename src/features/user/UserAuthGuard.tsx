import { Navigate } from "react-router-dom";
import React, { useEffect, useState } from "react";

export function UserAuthGuard({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Basic check for token/user state in local storage
    const token = localStorage.getItem("user_token");
    const lang = localStorage.getItem("user_lang");
    if (token && lang) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  if (isAuthenticated === null) return <div>Loading...</div>;

  return isAuthenticated ? children : <Navigate to="/user/login" replace />;
}
