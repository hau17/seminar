//  v1.6 Root App with Routing
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AdminDashboard } from "./features/admin/AdminDashboard";
import { BusinessAuth } from "./features/auth/BusinessAuth";
import { BusinessDashboard } from "./features/business/BusinessDashboard";
import { BusinessAuthGuard } from "./features/auth/BusinessAuthGuard";
import { UserLogin } from "./features/user/auth/UserLogin";
import { UserRegister } from "./features/user/auth/UserRegister";
import { UserLayout } from "./features/user/UserLayout";
import { UserAuthGuard } from "./features/user/UserAuthGuard";
import { InfoTab } from "./features/user/tabs/InfoTab";
import { MapTab } from "./features/user/tabs/MapTab";

export default function App() {
  return (
    <Router>
      {/*
        Toaster phải nằm bên trong Router để dùng được useNavigate trong toast actions.
        Đặt ở đây đảm bảo nó luôn mount dù ở route nào.
      */}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: "12px",
            padding: "12px 16px",
            fontSize: "14px",
            fontWeight: "600",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          },
          success: {
            style: { background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" },
            iconTheme: { primary: "#16a34a", secondary: "#f0fdf4" },
          },
          error: {
            style: { background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" },
            iconTheme: { primary: "#dc2626", secondary: "#fef2f2" },
          },
        }}
      />
      <Routes>
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/login" element={<AdminDashboard />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />

        {/* Business Routes — PRD §6.1, §6.2 */}
        <Route path="/business/auth" element={<BusinessAuth />} />
        <Route path="/business/login" element={<BusinessAuth />} />
        <Route path="/business/register" element={<BusinessAuth />} />
        <Route
          path="/business/dashboard"
          element={
            <BusinessAuthGuard>
              <BusinessDashboard />
            </BusinessAuthGuard>
          }
        />
        <Route
          path="/business/pois"
          element={
            <BusinessAuthGuard>
              <BusinessDashboard />
            </BusinessAuthGuard>
          }
        />

        {/* Tourist Routes (PWA) */}
        <Route path="/user/login" element={<UserLogin />} />
        <Route path="/user/register" element={<UserRegister />} />
        <Route path="/user" element={<UserAuthGuard><UserLayout /></UserAuthGuard>}>
          <Route path="info" element={<InfoTab />} />
          <Route path="map" element={<MapTab />} />
          <Route path="" element={<Navigate to="/user/info" replace />} />
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/admin" replace />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </Router>
  );
}

