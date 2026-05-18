import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Users, BookOpen, BarChart3, ArrowRight } from "lucide-react";
import { api } from "../../lib/api";

interface Stats {
  tenantCount: number;
  adminCount: number;
  quizCount: number;
  attemptCount: number;
}

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  customDomain: string | null;
  isDomainVerified: boolean;
  supportEmail: string;
  createdAt: string;
  _count: { users: number; quizzes: number; attempts: number };
}

const STAT_CARDS = [
  { key: "tenantCount", label: "Workspaces", icon: Building2, color: "text-indigo-400", bg: "bg-indigo-500/10 ring-indigo-500/20" },
  { key: "adminCount",  label: "Admin Users", icon: Users,     color: "text-violet-400", bg: "bg-violet-500/10 ring-violet-500/20" },
  { key: "quizCount",   label: "Quizzes",     icon: BookOpen,  color: "text-emerald-400", bg: "bg-emerald-500/10 ring-emerald-500/20" },
  { key: "attemptCount",label: "Attempts",    icon: BarChart3, color: "text-amber-400",   bg: "bg-amber-500/10 ring-amber-500/20" },
] as const;

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("sa_token")}` };
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Stats>("/superadmin/stats", { headers: authHeader() }),
      api.get<Tenant[]>("/superadmin/tenants", { headers: authHeader() }),
    ])
      .then(([s, t]) => {
        setStats(s);
        setTenants(t.slice(0, 5));
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-white">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Platform-wide overview</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4 mb-8">
        {STAT_CARDS.map(({ key, label, icon: Icon, color, bg }) => (
          <div key={key} className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <div className={`mb-4 inline-flex rounded-lg p-2.5 ring-1 ${bg}`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <p className="text-2xl font-bold text-white">
              {loading ? <span className="inline-block h-7 w-12 animate-pulse rounded bg-gray-800" /> : (stats?.[key] ?? 0)}
            </p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Recent tenants */}
      <div className="rounded-xl border border-gray-800 bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
          <h2 className="text-sm font-semibold text-white">Recent Workspaces</h2>
          <Link to="/tenants" className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {loading ? (
          <div className="space-y-3 p-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-800" />
            ))}
          </div>
        ) : tenants.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-gray-600">No workspaces yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left text-xs text-gray-500">
                <th className="px-6 py-3 font-medium">Workspace</th>
                <th className="px-6 py-3 font-medium">Subdomain</th>
                <th className="px-6 py-3 font-medium">Admins</th>
                <th className="px-6 py-3 font-medium">Quizzes</th>
                <th className="px-6 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {tenants.map((t) => (
                <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-3 font-medium text-white">{t.name}</td>
                  <td className="px-6 py-3 text-gray-400">{t.subdomain}</td>
                  <td className="px-6 py-3 text-gray-400">{t._count.users}</td>
                  <td className="px-6 py-3 text-gray-400">{t._count.quizzes}</td>
                  <td className="px-6 py-3 text-gray-400">{new Date(t.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
