import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SUPERADMIN_DEV_HOST, SUPERADMIN_HOST, SUPERADMIN_MICROSKILL_HOST } from "./lib/constants";

// Static: tiny guards with no page logic
import SuperAdminProtectedRoute from "./components/SuperAdminProtectedRoute";
import AdminProtectedRoute from "./components/AdminProtectedRoute";

// ── Superadmin chunk ──────────────────────────────────────────────────────────
const SuperAdminLayout  = lazy(() => import("./pages/superadmin/SuperAdminLayout"));
const SuperAdminLogin   = lazy(() => import("./pages/superadmin/Login"));
const SuperAdminDash    = lazy(() => import("./pages/superadmin/Dashboard"));
const Tenants           = lazy(() => import("./pages/superadmin/Tenants"));

// ── Admin chunk ───────────────────────────────────────────────────────────────
const AdminLayout    = lazy(() => import("./layouts/AdminLayout"));
const AdminLogin     = lazy(() => import("./pages/admin/AdminLogin"));
const AdminSignup    = lazy(() => import("./pages/admin/AdminSignup"));
const AdminVerify    = lazy(() => import("./pages/admin/AdminVerify"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const Quizzes        = lazy(() => import("./pages/admin/Quizzes"));
const QuizDetail     = lazy(() => import("./pages/admin/QuizDetail"));
const Results        = lazy(() => import("./pages/admin/Results"));
const Settings       = lazy(() => import("./pages/admin/Settings"));

// ── Public quiz chunk ─────────────────────────────────────────────────────────
const QuizLanding    = lazy(() => import("./pages/quiz/QuizLanding"));
const AttemptResults = lazy(() => import("./pages/quiz/AttemptResults"));

// ── Shared ────────────────────────────────────────────────────────────────────
const NotFound = lazy(() => import("./pages/NotFound"));

// ─── Fallback UI ──────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
        <p className="text-xs text-muted-foreground">Loading…</p>
      </div>
    </div>
  );
}

// ─── Route trees ─────────────────────────────────────────────────────────────

const isSuperAdmin =
  window.location.hostname === SUPERADMIN_HOST ||
  window.location.hostname === SUPERADMIN_MICROSKILL_HOST ||
  window.location.hostname === SUPERADMIN_DEV_HOST;

function SuperAdminRoutes() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/superadmin/login" element={<SuperAdminLogin />} />
        <Route element={<SuperAdminProtectedRoute />}>
          <Route element={<SuperAdminLayout />}>
            <Route index element={<SuperAdminDash />} />
            <Route path="/tenants" element={<Tenants />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

function TenantRoutes() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        {/* Auth — public */}
        <Route path="/admin/login"  element={<AdminLogin />} />
        <Route path="/admin/signup" element={<AdminSignup />} />
        <Route path="/verify"       element={<AdminVerify />} />

        {/* Admin — protected */}
        <Route element={<AdminProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard"        element={<AdminDashboard />} />
            <Route path="/admin/quizzes"          element={<Quizzes />} />
            <Route path="/admin/quizzes/:quizId"  element={<QuizDetail />} />
            <Route path="/admin/results"          element={<Results />} />
            <Route path="/admin/settings"         element={<Settings />} />
          </Route>
        </Route>

        {/* Public quiz */}
        <Route path="/t/:quizSlug"              element={<QuizLanding />} />
        <Route path="/t/:quizSlug/:attemptSlug" element={<AttemptResults />} />

        <Route index element={<Navigate to="/admin/login" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      {isSuperAdmin ? <SuperAdminRoutes /> : <TenantRoutes />}
    </BrowserRouter>
  );
}
