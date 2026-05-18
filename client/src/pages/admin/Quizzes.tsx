import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Trash2, ChevronRight, BookOpen, Check, Copy, Code2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

interface Quiz {
  id: string;
  title: string;
  slug: string;
  totalQuestionsToDisplay: number;
  createdAt: string;
  _count: { questions: number; attempts: number };
}

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("admin_token")}` };
}

export default function Quizzes() {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [total, setTotal] = useState("10");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [embedSlug, setEmbedSlug] = useState<string | null>(null);
  const [embedCopied, setEmbedCopied] = useState(false);

  function copyEmbedCode(slug: string) {
    const src = `${window.location.origin}/t/${slug}`;
    const code = `<iframe\n  src="${src}"\n  width="100%"\n  height="700"\n  style="border:none;border-radius:12px;"\n  allow="clipboard-write"\n></iframe>\n<script>\nwindow.addEventListener('message', function(e) {\n  if (e.data?.type === 'quiz-resize') {\n    document.querySelector('iframe[src^="${src}"]').style.height = e.data.height + 'px';\n  }\n});\n<\\/script>`;
    navigator.clipboard.writeText(code).then(() => {
      setEmbedCopied(true);
      setTimeout(() => setEmbedCopied(false), 1500);
    });
  }

  function copyQuizLink(e: React.MouseEvent, slug: string) {
    e.stopPropagation();
    const url = `${window.location.origin}/t/${slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(null), 1500);
    });
  }

  useEffect(() => { fetchQuizzes(); }, []);

  function fetchQuizzes() {
    setLoading(true);
    api.get<Quiz[]>("/admin/quizzes", { headers: authHeader() })
      .then(setQuizzes)
      .finally(() => setLoading(false));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);
    try {
      const quiz = await api.post<Quiz>("/admin/quizzes", {
        title,
        totalQuestionsToDisplay: Number(total),
      }, { headers: authHeader() });
      setQuizzes((p) => [quiz, ...p]);
      setShowCreate(false);
      setTitle(""); setTotal("10");
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create quiz");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/admin/quizzes/${id}`, { headers: authHeader() });
      setQuizzes((p) => p.filter((q) => q.id !== id));
    } finally {
      setDeleteId(null);
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Quizzes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{quizzes.length} total</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> New Quiz
        </Button>
      </div>

      <Card>
        {loading ? (
          <CardContent className="space-y-3 pt-6">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </CardContent>
        ) : quizzes.length === 0 ? (
          <CardContent className="flex flex-col items-center justify-center py-20">
            <BookOpen className="h-8 w-8 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No quizzes yet</p>
            <button onClick={() => setShowCreate(true)} className="mt-3 text-sm font-medium text-primary hover:underline transition-colors">
              Create your first quiz →
            </button>
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead className="text-center">Questions</TableHead>
                <TableHead className="text-center">Shows</TableHead>
                <TableHead className="text-center">Attempts</TableHead>
                <TableHead>Created</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {quizzes.map((q) => (
                <TableRow
                  key={q.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/admin/quizzes/${q.id}`)}
                >
                  <TableCell className="font-medium text-foreground">{q.title}</TableCell>
                  <TableCell>
                    <button
                      onClick={(e) => copyQuizLink(e, q.slug)}
                      className="group inline-flex items-center gap-1.5"
                      title="Copy quiz link"
                    >
                      <Badge variant="secondary" className="font-mono text-xs group-hover:bg-secondary/80 transition-colors">
                        {q.slug}
                      </Badge>
                      {copiedSlug === q.slug
                        ? <Check className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                        : <Copy className="h-3 w-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 flex-shrink-0 transition-opacity" />}
                    </button>
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">{q._count.questions}</TableCell>
                  <TableCell className="text-center text-muted-foreground">{q.totalQuestionsToDisplay}</TableCell>
                  <TableCell className="text-center text-muted-foreground">{q._count.attempts}</TableCell>
                  <TableCell className="text-muted-foreground">{new Date(q.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <Link to={`/admin/quizzes/${q.id}`}>
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                          View Details <ChevronRight className="h-3 w-3" />
                        </Button>
                      </Link>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => { setEmbedSlug(q.slug); setEmbedCopied(false); }} title="Embed quiz">
                        <Code2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteId(q.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => { setShowCreate(open); if (!open) setCreateError(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Quiz</DialogTitle>
            <DialogDescription>Create a new quiz for your workspace.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 mt-2">
            {createError && (
              <Alert variant="destructive">
                <AlertDescription>{createError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="quiz-title">Title</Label>
              <Input
                id="quiz-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="AWS Solutions Architect Practice"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quiz-total">Questions shown per attempt</Label>
              <Input
                id="quiz-total"
                type="number"
                required
                min={1}
                value={total}
                onChange={(e) => setTotal(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">A random subset of this size is shown each time.</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowCreate(false); setCreateError(null); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete quiz?</DialogTitle>
            <DialogDescription>
              All questions and attempt records will be permanently deleted. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Embed dialog */}
      <Dialog open={!!embedSlug} onOpenChange={(open) => { if (!open) setEmbedSlug(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Embed Quiz</DialogTitle>
            <DialogDescription>
              Paste this snippet into any webpage to embed the quiz in an iframe. The iframe height auto-adjusts via postMessage.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-border bg-muted/50 p-4 font-mono text-xs leading-relaxed text-foreground whitespace-pre overflow-x-auto">
{`<iframe
  src="${window.location.origin}/t/${embedSlug}"
  width="100%"
  height="700"
  style="border:none;border-radius:12px;"
  allow="clipboard-write"
></iframe>
<script>
window.addEventListener('message', function(e) {
  if (e.data?.type === 'quiz-resize') {
    document.querySelector(
      'iframe[src^="${window.location.origin}/t/${embedSlug}"]'
    ).style.height = e.data.height + 'px';
  }
});
</script>`}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmbedSlug(null)}>Close</Button>
            <Button onClick={() => embedSlug && copyEmbedCode(embedSlug)} className="gap-1.5">
              {embedCopied
                ? <><Check className="h-3.5 w-3.5" /> Copied!</>
                : <><Copy className="h-3.5 w-3.5" /> Copy Code</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
