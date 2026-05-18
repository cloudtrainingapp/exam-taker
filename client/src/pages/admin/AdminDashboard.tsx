import { useEffect, useState } from "react";
import { BookOpen, HelpCircle, BarChart3, TrendingUp } from "lucide-react";
import { api } from "../../lib/api";

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
  { key: "quizCount",     label: "Quizzes",    icon: BookOpen,   color: "text-violet-400", bg: "bg-violet-500/10 ring-violet-500/20" },
  { key: "questionCount", label: "Questions",  icon: HelpCircle, color: "text-blue-400",   bg: "bg-blue-500/10 ring-blue-500/20" },
  { key: "attemptCount",  label: "Attempts",   icon: BarChart3,  color: "text-emerald-400",bg: "bg-emerald-500/10 ring-emerald-500/20" },
  { key: "avgScore",      label: "Avg Score",  icon: TrendingUp, color: "text-amber-400",  bg: "bg-amber-500/10 ring-amber-500/20" },
] as const;

const PERCENT_KEYS = new Set<string>(["avgScore"]);

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("admin_token")}` };
}

function scoreColor(score: number) {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-1.5 w-20 rounded-full bg-gray-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : "bg-red-500"}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`text-xs font-medium tabular-nums ${scoreColor(score)}`}>
        {score.toFixed(0)}%
      </span>
    </div>
  );
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
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  const stats = data?.stats;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        {loading ? (
          <div className="h-6 w-48 animate-pulse rounded bg-gray-800" />
        ) : (
          <>
            <h1 className="text-xl font-semibold text-white">
              Welcome back{data?.tenant.name ? `, ${data.tenant.name}` : ""}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Here's what's happening in your workspace.</p>
          </>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4 mb-8">
        {STAT_CARDS.map(({ key, label, icon: Icon, color, bg }) => (
          <div key={key} className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <div className={`mb-4 inline-flex rounded-lg p-2.5 ring-1 ${bg}`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <p className="text-2xl font-bold text-white tabular-nums">
              {loading ? (
                <span className="inline-block h-7 w-12 animate-pulse rounded bg-gray-800" />
              ) : PERCENT_KEYS.has(key) ? (
                `${(stats?.[key as keyof Stats] as number ?? 0).toFixed(1)}%`
              ) : (
                (stats?.[key as keyof Stats] ?? 0)
              )}
            </p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Recent Attempts */}
      <div className="rounded-xl border border-gray-800 bg-gray-900">
        <div className="border-b border-gray-800 px-6 py-4">
          <h2 className="text-sm font-semibold text-white">Recent Attempts</h2>
        </div>

        {loading ? (
          <div className="space-y-3 p-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-800" />
            ))}
          </div>
        ) : !data?.recentAttempts.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <BarChart3 className="h-8 w-8 text-gray-700 mb-3" />
            <p className="text-sm text-gray-500">No attempts yet</p>
            <p className="text-xs text-gray-600 mt-1">Share a quiz link to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left text-xs text-gray-500">
                  <th className="px-6 py-3 font-medium">User</th>
                  <th className="px-6 py-3 font-medium">Quiz</th>
                  <th className="px-6 py-3 font-medium">Score</th>
                  <th className="px-6 py-3 font-medium">Correct</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {data.recentAttempts.map((attempt) => (
                  <tr key={attempt.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-3.5">
                      <p className="font-medium text-white leading-tight">{attempt.user.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{attempt.user.email}</p>
                    </td>
                    <td className="px-6 py-3.5 text-gray-300">{attempt.quiz.title}</td>
                    <td className="px-6 py-3.5">
                      <ScoreBar score={attempt.score} />
                    </td>
                    <td className="px-6 py-3.5 text-gray-400 tabular-nums">
                      {attempt.totalCorrect}/{attempt.totalQuestions}
                    </td>
                    <td className="px-6 py-3.5 text-gray-500 whitespace-nowrap">
                      {new Date(attempt.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
