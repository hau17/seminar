//  v1.5 Root App with Routing
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AdminDashboard } from "./pages/AdminDashboard";
import { BusinessAuth } from "./pages/BusinessAuth";
import { BusinessDashboard } from "./pages/BusinessDashboard";
import { BusinessAuthGuard } from "./components/BusinessAuthGuard";

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminDashboard />} />

        {/* Business Routes */}
        <Route path="/business/auth" element={<BusinessAuth />} />
        <Route
          path="/business/dashboard"
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
