import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, BookOpen, BarChart3, Settings, GraduationCap, LogOut } from "lucide-react";
import { clsx } from "clsx";

const NAV = [
  { to: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/quizzes",   icon: BookOpen,        label: "Quizzes" },
  { to: "/admin/results",   icon: BarChart3,        label: "Results" },
  { to: "/admin/settings",  icon: Settings,         label: "Settings" },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const hostname = window.location.hostname;
  const workspace = hostname.split(".")[0];

  function handleLogout() {
    localStorage.removeItem("admin_token");
    navigate("/admin/login", { replace: true });
  }

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      {/* Sidebar */}
      <aside className="flex w-60 flex-shrink-0 flex-col border-r border-gray-800 bg-gray-900">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-gray-800">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600/20 ring-1 ring-violet-500/30">
            <GraduationCap className="h-4 w-4 text-violet-400" />
          </div>
          <div className="leading-tight min-w-0">
            <p className="text-sm font-semibold text-white truncate capitalize">{workspace}</p>
            <p className="text-xs text-gray-500">Admin Portal</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 px-3 py-4">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-violet-600/15 text-violet-400"
                    : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                )
              }
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="border-t border-gray-800 p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-gray-200 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
