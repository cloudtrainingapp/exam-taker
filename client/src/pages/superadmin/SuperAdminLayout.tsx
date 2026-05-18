import { Outlet } from "react-router-dom";

export default function SuperAdminLayout() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4">
        <span className="text-sm font-semibold tracking-widest text-indigo-400 uppercase">
          SuperAdmin
        </span>
      </header>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}
