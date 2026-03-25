// ✅ v1.7: Business Auth Guard — Protect Business Routes
// Uses <Navigate replace> pattern to avoid infinite redirect loops
import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useBusinessAuth } from "../../context/BusinessAuthContext";

interface BusinessAuthGuardProps {
  children: ReactNode;
}

export function BusinessAuthGuard({ children }: BusinessAuthGuardProps) {
  const { auth, isLoading } = useBusinessAuth();
  const location = useLocation();

  // ✅ CRITICAL FIX: Use <Navigate> JSX component instead of useNavigate hook
  // This prevents useState→setState→re-render infinite loops
  // Navigate only evaluates when location.pathname changes

  // ✅ Show loading screen WHILE checking localStorage for saved token
  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-emerald-500 mb-4"></div>
          <p className="text-slate-600 text-sm">Đang kiểm tra xác thực...</p>
        </div>
      </div>
    );
  }

  // ✅ After loading complete: Check if authenticated
  // If NO auth and NOT on login page → redirect to login
  if (!auth && location.pathname !== "/business/auth") {
    return <Navigate to="/business/auth" replace />;
  }

  // ✅ Authenticated OR on auth page → render children
  return <>{children}</>;
}
