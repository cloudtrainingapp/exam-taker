import { Navigate, Outlet } from "react-router-dom";

function decodeToken(token: string): { role?: string; exp?: number } | null {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

export default function SuperAdminProtectedRoute() {
  const token = localStorage.getItem("sa_token");

  if (!token) return <Navigate to="/superadmin/login" replace />;

  const payload = decodeToken(token);

  if (!payload || payload.role !== "SUPERADMIN") {
    localStorage.removeItem("sa_token");
    return <Navigate to="/superadmin/login" replace />;
  }

  if (payload.exp && payload.exp * 1000 < Date.now()) {
    localStorage.removeItem("sa_token");
    return <Navigate to="/superadmin/login" replace />;
  }

  return <Outlet />;
}
