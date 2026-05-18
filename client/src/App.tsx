import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SUPERADMIN_DEV_HOST, SUPERADMIN_HOST } from "./lib/constants";

import SuperAdminLayout from "./pages/superadmin/SuperAdminLayout";
import SuperAdminLogin from "./pages/superadmin/Login";
import Dashboard from "./pages/superadmin/Dashboard";
import Tenants from "./pages/superadmin/Tenants";
import SuperAdminProtectedRoute from "./components/SuperAdminProtectedRoute";

import AdminLayout from "./layouts/AdminLayout";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminSignup from "./pages/admin/AdminSignup";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminVerify from "./pages/admin/AdminVerify";
import Quizzes from "./pages/admin/Quizzes";
import QuizDetail from "./pages/admin/QuizDetail";
import Results from "./pages/admin/Results";
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
          <Route index element={<Dashboard />} />
          <Route path="/tenants" element={<Tenants />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function TenantRoutes() {
  return (
    <Routes>
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/signup" element={<AdminSignup />} />
      <Route path="/verify" element={<AdminVerify />} />

      <Route element={<AdminProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/quizzes" element={<Quizzes />} />
          <Route path="/admin/quizzes/:quizId" element={<QuizDetail />} />
          <Route path="/admin/results" element={<Results />} />
        </Route>
      </Route>

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
