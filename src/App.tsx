//  v1.6 Root App with Routing
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AdminDashboard } from "./features/admin/AdminDashboard";
import { BusinessAuth } from "./features/auth/BusinessAuth";
import { BusinessDashboard } from "./features/business/BusinessDashboard";
import { BusinessAuthGuard } from "./features/auth/BusinessAuthGuard";

export default function App() {
  return (
    <Router>
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

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/admin" replace />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </Router>
  );
}

