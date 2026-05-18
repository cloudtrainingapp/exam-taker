import { useEffect, useState, useCallback } from "react";
import { ExternalLink, Search, ChevronLeft, ChevronRight, BarChart3 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

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

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("admin_token")}` };
}

function scoreBadgeVariant(score: number): "success" | "warning" | "destructive" {
  if (score >= 80) return "success";
  if (score >= 60) return "warning";
  return "destructive";
}

function ScoreCell({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2.5 min-w-[120px]">
      <Progress value={score} className="h-1.5 w-16" />
      <Badge variant={scoreBadgeVariant(score)} className="text-xs tabular-nums">
        {score.toFixed(0)}%
      </Badge>
    </div>
  );
}

export default function Results() {
  const [data, setData] = useState<ResultsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [quizId, setQuizId] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (quizId) params.set("quizId", quizId);
    if (search) params.set("search", search);

    api.get<ResultsResponse>(`/admin/results?${params}`, { headers: authHeader() })
      .then(setData)
      .finally(() => setLoading(false));
  }, [page, quizId, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function applySearch() {
    setPage(1);
    setSearch(searchInput);
  }

  function clearFilters() {
    setSearch(""); setSearchInput(""); setQuizId(""); setPage(1);
  }

  const pagination = data?.pagination;
  const quizzes = data?.quizzes ?? [];
  const attempts = data?.attempts ?? [];
  const hasFilters = !!(search || quizId);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Results</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {pagination ? `${pagination.total} attempt${pagination.total !== 1 ? "s" : ""} total` : ""}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={quizId} onChange={(e) => { setPage(1); setQuizId(e.target.value); }} className="w-auto min-w-[160px]">
          <option value="">All quizzes</option>
          {quizzes.map((q) => (
            <option key={q.id} value={q.id}>{q.title}</option>
          ))}
        </Select>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name or email…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applySearch()}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={applySearch}>Search</Button>
        {hasFilters && (
          <Button variant="ghost" className="text-muted-foreground" onClick={clearFilters}>
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        {loading ? (
          <CardContent className="space-y-3 pt-6">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </CardContent>
        ) : attempts.length === 0 ? (
          <CardContent className="flex flex-col items-center justify-center py-20">
            <BarChart3 className="h-8 w-8 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No results found</p>
            {hasFilters && (
              <button onClick={clearFilters} className="mt-2 text-sm text-primary hover:underline">
                Clear filters
              </button>
            )}
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
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {attempts.map((a) => (
                <TableRow key={a.id} className="group">
                  <TableCell>
                    <p className="font-medium text-foreground leading-tight">{a.user.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.user.email}</p>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{a.quiz.title}</TableCell>
                  <TableCell><ScoreCell score={a.score} /></TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {a.totalCorrect}/{a.totalQuestions}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {new Date(a.submittedAt).toLocaleDateString(undefined, {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                  </TableCell>
                  <TableCell>
                    <a
                      href={`/t/${a.quiz.slug}/${a.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground text-xs">
            Showing {(pagination.page - 1) * pagination.pageSize + 1}–
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={pagination.page === 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 text-xs text-muted-foreground tabular-nums">
              {pagination.page} / {pagination.totalPages}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={pagination.page === pagination.totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
