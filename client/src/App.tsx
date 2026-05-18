import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SUPERADMIN_DEV_HOST, SUPERADMIN_HOST } from "./lib/constants";

import SuperAdminLayout from "./pages/superadmin/SuperAdminLayout";
import SuperAdminLogin from "./pages/superadmin/Login";
import TenantsPage from "./pages/superadmin/TenantsPage";
import SuperAdminProtectedRoute from "./components/SuperAdminProtectedRoute";

import AdminLogin from "./pages/admin/AdminLogin";
import AdminSignup from "./pages/admin/AdminSignup";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminVerify from "./pages/admin/AdminVerify";
import AdminProtectedRoute from "./components/AdminProtectedRoute";

import QuizLanding from "./pages/quiz/QuizLanding";
import AttemptResults from "./pages/quiz/AttemptResults";

import NotFound from "./pages/NotFound";

const isSuperAdmin =
  window.location.hostname === SUPERADMIN_HOST ||
  window.location.hostname === SUPERADMIN_DEV_HOST;

function SuperAdminRoutes() {
  return (
    <Routes>
      <Route path="/superadmin/login" element={<SuperAdminLogin />} />
      <Route element={<SuperAdminProtectedRoute />}>
        <Route element={<SuperAdminLayout />}>
          <Route index element={<TenantsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function TenantRoutes() {
  return (
    <Routes>
      {/* Public auth */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/signup" element={<AdminSignup />} />
      <Route path="/verify" element={<AdminVerify />} />

      {/* Protected admin */}
      <Route element={<AdminProtectedRoute />}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
      </Route>

      {/* Public quiz */}
      <Route path="/t/:quizSlug" element={<QuizLanding />} />
      <Route path="/t/:quizSlug/:attemptSlug" element={<AttemptResults />} />

      <Route index element={<Navigate to="/admin/login" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      {isSuperAdmin ? <SuperAdminRoutes /> : <TenantRoutes />}
    </BrowserRouter>
  );
}
