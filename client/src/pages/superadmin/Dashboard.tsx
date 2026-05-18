import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Users, BookOpen, BarChart3, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
  createdAt: string;
  _count: { users: number; quizzes: number; attempts: number };
}

const STAT_CARDS = [
  { key: "tenantCount",  label: "Workspaces",  icon: Building2, color: "text-primary",     bg: "bg-primary/10" },
  { key: "adminCount",   label: "Admin Users",  icon: Users,     color: "text-violet-500",   bg: "bg-violet-500/10" },
  { key: "quizCount",    label: "Quizzes",      icon: BookOpen,  color: "text-emerald-500",  bg: "bg-emerald-500/10" },
  { key: "attemptCount", label: "Attempts",     icon: BarChart3, color: "text-amber-500",    bg: "bg-amber-500/10" },
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
      .then(([s, t]) => { setStats(s); setTenants(t.slice(0, 5)); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Platform-wide overview</p>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {STAT_CARDS.map(({ key, label, icon: Icon, color, bg }) => (
          <Card key={key}>
            <CardContent className="p-5">
              <div className={`mb-4 inline-flex rounded-lg p-2.5 ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <p className="text-2xl font-bold text-foreground">
                {loading ? <Skeleton className="h-7 w-12 inline-block" /> : (stats?.[key] ?? 0)}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between border-b border-border pb-4">
          <CardTitle className="text-sm font-semibold">Recent Workspaces</CardTitle>
          <Link to="/tenants" className="flex items-center gap-1 text-xs text-primary hover:underline">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        {loading ? (
          <CardContent className="space-y-3 pt-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </CardContent>
        ) : tenants.length === 0 ? (
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No workspaces yet
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workspace</TableHead>
                <TableHead>Subdomain</TableHead>
                <TableHead>Admins</TableHead>
                <TableHead>Quizzes</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium text-foreground">{t.name}</TableCell>
                  <TableCell className="text-muted-foreground">{t.subdomain}</TableCell>
                  <TableCell className="text-muted-foreground">{t._count.users}</TableCell>
                  <TableCell className="text-muted-foreground">{t._count.quizzes}</TableCell>
                  <TableCell className="text-muted-foreground">{new Date(t.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
