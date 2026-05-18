import { Navigate, Outlet } from "react-router-dom";

function decodeToken(token: string): { role?: string; tenantId?: string; exp?: number } | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload;
  } catch {
    return null;
  }
}

export default function AdminProtectedRoute() {
  const token = localStorage.getItem("admin_token");

  if (!token) return <Navigate to="/admin/login" replace />;

  const payload = decodeToken(token);

  if (!payload || payload.role !== "ADMIN") {
    localStorage.removeItem("admin_token");
    return <Navigate to="/admin/login" replace />;
  }

  if (payload.exp && payload.exp * 1000 < Date.now()) {
    localStorage.removeItem("admin_token");
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
}
