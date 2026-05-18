import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, ChevronRight, BookOpen } from "lucide-react";
import { api } from "../../lib/api";

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
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [total, setTotal] = useState("10");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);

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
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Quizzes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{quizzes.length} total</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 transition-colors"
        >
          <Plus className="h-4 w-4" /> New Quiz
        </button>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-6">
            {[...Array(3)].map((_, i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-800" />)}
          </div>
        ) : quizzes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <BookOpen className="h-8 w-8 text-gray-700 mb-3" />
            <p className="text-sm text-gray-500">No quizzes yet</p>
            <button onClick={() => setShowCreate(true)} className="mt-3 text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors">
              Create your first quiz →
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left text-xs text-gray-500">
                <th className="px-6 py-3 font-medium">Title</th>
                <th className="px-6 py-3 font-medium">Slug</th>
                <th className="px-6 py-3 font-medium text-center">Questions</th>
                <th className="px-6 py-3 font-medium text-center">Shows</th>
                <th className="px-6 py-3 font-medium text-center">Attempts</th>
                <th className="px-6 py-3 font-medium">Created</th>
                <th className="px-6 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {quizzes.map((q) => (
                <tr key={q.id} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-3.5">
                    <Link to={`/admin/quizzes/${q.id}`} className="font-medium text-white hover:text-violet-400 transition-colors">
                      {q.title}
                    </Link>
                  </td>
                  <td className="px-6 py-3.5">
                    <code className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-300">{q.slug}</code>
                  </td>
                  <td className="px-6 py-3.5 text-center text-gray-400">{q._count.questions}</td>
                  <td className="px-6 py-3.5 text-center text-gray-400">{q.totalQuestionsToDisplay}</td>
                  <td className="px-6 py-3.5 text-center text-gray-400">{q._count.attempts}</td>
                  <td className="px-6 py-3.5 text-gray-500">{new Date(q.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link to={`/admin/quizzes/${q.id}`} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-800 hover:text-gray-200 transition-colors">
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                      <button onClick={() => setDeleteId(q.id)} className="rounded-md p-1.5 text-gray-600 hover:bg-red-500/10 hover:text-red-400 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl">
            <h2 className="text-base font-semibold text-white mb-5">New Quiz</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              {createError && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{createError}</div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Title</label>
                <input
                  type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3.5 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition"
                  placeholder="AWS Solutions Architect Practice"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Questions shown per attempt</label>
                <input
                  type="number" required min={1} value={total} onChange={(e) => setTotal(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3.5 py-2.5 text-sm text-white outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition"
                />
                <p className="mt-1.5 text-xs text-gray-600">A random subset of this size is shown each time.</p>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowCreate(false); setCreateError(null); }}
                  className="flex-1 rounded-lg border border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-800 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={creating}
                  className="flex-1 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50 transition-colors">
                  {creating ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl">
            <h2 className="text-base font-semibold text-white mb-2">Delete quiz?</h2>
            <p className="text-sm text-gray-400 mb-6">All questions and attempt records will be permanently deleted.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 rounded-lg border border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-800 transition-colors">Cancel</button>
              <button onClick={() => handleDelete(deleteId)} className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
