import { useEffect, useState } from "react";
import { BookOpen, HelpCircle, BarChart3, TrendingUp } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Tenant {
  name: string;
  subdomain: string;
}

interface Stats {
  quizCount: number;
  questionCount: number;
  attemptCount: number;
  avgScore: number;
}

interface RecentAttempt {
  id: string;
  slug: string;
  score: number;
  totalCorrect: number;
  totalQuestions: number;
  createdAt: string;
  quiz: { title: string; slug: string };
  user: { name: string; email: string };
}

interface DashboardData {
  tenant: Tenant;
  stats: Stats;
  recentAttempts: RecentAttempt[];
}

const STAT_CARDS = [
  { key: "quizCount",     label: "Quizzes",   icon: BookOpen,   color: "text-primary",    bg: "bg-primary/10" },
  { key: "questionCount", label: "Questions", icon: HelpCircle, color: "text-blue-500",   bg: "bg-blue-500/10" },
  { key: "attemptCount",  label: "Attempts",  icon: BarChart3,  color: "text-emerald-500",bg: "bg-emerald-500/10" },
  { key: "avgScore",      label: "Avg Score", icon: TrendingUp, color: "text-amber-500",  bg: "bg-amber-500/10" },
] as const;

const PERCENT_KEYS = new Set<string>(["avgScore"]);

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("admin_token")}` };
}

function scoreBadgeVariant(score: number): "success" | "warning" | "destructive" {
  if (score >= 80) return "success";
  if (score >= 60) return "warning";
  return "destructive";
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<DashboardData>("/admin/dashboard", { headers: authHeader() })
      .then(setData)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  if (error) {
    return (
      <div className="flex min-h-full items-center justify-center p-8">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  const stats = data?.stats;

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        {loading ? (
          <Skeleton className="h-6 w-48" />
        ) : (
          <>
            <h1 className="text-xl font-semibold text-foreground">
              Welcome back{data?.tenant.name ? `, ${data.tenant.name}` : ""}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Here's what's happening in your workspace.</p>
          </>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {STAT_CARDS.map(({ key, label, icon: Icon, color, bg }) => (
          <Card key={key}>
            <CardContent className="p-5">
              <div className={`mb-4 inline-flex rounded-lg p-2.5 ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <p className="text-2xl font-bold text-foreground tabular-nums">
                {loading ? (
                  <Skeleton className="h-7 w-12" />
                ) : PERCENT_KEYS.has(key) ? (
                  `${(stats?.[key as keyof Stats] as number ?? 0).toFixed(1)}%`
                ) : (
                  (stats?.[key as keyof Stats] ?? 0)
                )}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Attempts */}
      <Card>
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-sm font-semibold">Recent Attempts</CardTitle>
        </CardHeader>

        {loading ? (
          <CardContent className="space-y-3 pt-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        ) : !data?.recentAttempts.length ? (
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BarChart3 className="h-8 w-8 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No attempts yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Share a quiz link to get started</p>
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Quiz</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Correct</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recentAttempts.map((attempt) => (
                <TableRow key={attempt.id}>
                  <TableCell>
                    <p className="font-medium text-foreground leading-tight">{attempt.user.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{attempt.user.email}</p>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{attempt.quiz.title}</TableCell>
                  <TableCell>
                    <Badge variant={scoreBadgeVariant(attempt.score)}>
                      {attempt.score.toFixed(0)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {attempt.totalCorrect}/{attempt.totalQuestions}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {new Date(attempt.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
