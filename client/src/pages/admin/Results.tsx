import { useEffect, useState, useCallback } from "react";
import { ExternalLink, Search, ChevronLeft, ChevronRight, BarChart3 } from "lucide-react";
import { api } from "../../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Quiz {
  id: string;
  title: string;
}

interface Attempt {
  id: string;
  slug: string;
  score: number;
  totalCorrect: number;
  totalQuestions: number;
  submittedAt: string;
  quiz: { id: string; title: string; slug: string };
  user: { name: string; email: string };
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface ResultsResponse {
  attempts: Attempt[];
  quizzes: Quiz[];
  pagination: Pagination;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
          className={`h-full rounded-full ${score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : "bg-red-500"}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`text-xs font-medium tabular-nums ${scoreColor(score)}`}>
        {score.toFixed(0)}%
      </span>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Results() {
  const [data, setData] = useState<ResultsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [quizId, setQuizId] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const fetch = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (quizId) params.set("quizId", quizId);
    if (search) params.set("search", search);

    api.get<ResultsResponse>(`/admin/results?${params}`, { headers: authHeader() })
      .then(setData)
      .finally(() => setLoading(false));
  }, [page, quizId, search]);

  useEffect(() => { fetch(); }, [fetch]);

  // Reset to page 1 when filters change
  function applySearch() {
    setPage(1);
    setSearch(searchInput);
  }

  function handleQuizChange(id: string) {
    setPage(1);
    setQuizId(id);
  }

  const pagination = data?.pagination;
  const quizzes = data?.quizzes ?? [];
  const attempts = data?.attempts ?? [];

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Results</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {pagination ? `${pagination.total} attempt${pagination.total !== 1 ? "s" : ""} total` : ""}
        </p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Quiz filter */}
        <select
          value={quizId}
          onChange={(e) => handleQuizChange(e.target.value)}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-violet-500 transition"
        >
          <option value="">All quizzes</option>
          {quizzes.map((q) => (
            <option key={q.id} value={q.id}>{q.title}</option>
          ))}
        </select>

        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
            <input
              type="text"
              placeholder="Search by name or email…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applySearch()}
              className="rounded-lg border border-gray-700 bg-gray-800 pl-8 pr-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-violet-500 transition w-64"
            />
          </div>
          <button
            onClick={applySearch}
            className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 transition-colors"
          >
            Search
          </button>
          {(search || quizId) && (
            <button
              onClick={() => { setSearch(""); setSearchInput(""); setQuizId(""); setPage(1); }}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-800" />
            ))}
          </div>
        ) : attempts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <BarChart3 className="h-8 w-8 text-gray-700 mb-3" />
            <p className="text-sm text-gray-500">No results found</p>
            {(search || quizId) && (
              <button
                onClick={() => { setSearch(""); setSearchInput(""); setQuizId(""); setPage(1); }}
                className="mt-2 text-sm text-violet-400 hover:text-violet-300 transition-colors"
              >
                Clear filters
              </button>
            )}
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
                  <th className="px-6 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {attempts.map((a) => (
                  <tr key={a.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-3.5">
                      <p className="font-medium text-white leading-tight">{a.user.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{a.user.email}</p>
                    </td>
                    <td className="px-6 py-3.5 text-gray-300">{a.quiz.title}</td>
                    <td className="px-6 py-3.5">
                      <ScoreBar score={a.score} />
                    </td>
                    <td className="px-6 py-3.5 text-gray-400 tabular-nums">
                      {a.totalCorrect}/{a.totalQuestions}
                    </td>
                    <td className="px-6 py-3.5 text-gray-500 whitespace-nowrap">
                      {new Date(a.submittedAt).toLocaleDateString(undefined, {
                        month: "short", day: "numeric", year: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-3.5">
                      <a
                        href={`/t/${a.quiz.slug}/${a.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="opacity-0 group-hover:opacity-100 transition-opacity rounded-md p-1.5 text-gray-500 hover:bg-gray-800 hover:text-gray-200 inline-flex"
                        title="View attempt"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-gray-500 text-xs">
            Showing {(pagination.page - 1) * pagination.pageSize + 1}–
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pagination.page === 1}
              className="rounded-md p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 text-xs text-gray-400 tabular-nums">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={pagination.page === pagination.totalPages}
              className="rounded-md p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
