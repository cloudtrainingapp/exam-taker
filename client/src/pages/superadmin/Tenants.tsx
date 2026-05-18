import { useEffect, useState, useRef } from "react";
import { Plus, Trash2, Copy, CheckCircle2, XCircle } from "lucide-react";
import { api } from "../../lib/api";

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

interface CreateForm {
  name: string;
  subdomain: string;
  supportEmail: string;
  adminName: string;
  adminEmail: string;
}

const CENTRAL = import.meta.env.VITE_CENTRAL_DOMAIN ?? "localhost:5173";

function signupUrl(subdomain: string) {
  const isProd = import.meta.env.PROD;
  const proto = isProd ? "https" : "http";
  return `${proto}://${subdomain}.${CENTRAL}/admin/signup`;
}

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("sa_token")}` };
}

export default function Tenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateForm>({ name: "", subdomain: "", supportEmail: "", adminName: "", adminEmail: "" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTenants();
  }, []);

  function fetchTenants() {
    setLoading(true);
    api
      .get<Tenant[]>("/superadmin/tenants", { headers: authHeader() })
      .then(setTenants)
      .finally(() => setLoading(false));
  }

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "subdomain" ? value.toLowerCase().replace(/[^a-z0-9-]/g, "") : value,
    }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);
    try {
      const { tenant, tempPassword } = await api.post<{ tenant: Tenant; tempPassword: string }>(
        "/superadmin/tenants",
        form,
        { headers: authHeader() }
      );
      setTenants((prev) => [tenant, ...prev]);
      setShowCreate(false);
      setForm({ name: "", subdomain: "", supportEmail: "", adminName: "", adminEmail: "" });
      setCreatedPassword(tempPassword);
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create workspace");
    } finally {
      setCreating(false);
    }
  }

  function copyPassword() {
    if (!createdPassword) return;
    navigator.clipboard.writeText(createdPassword);
    setPasswordCopied(true);
    setTimeout(() => setPasswordCopied(false), 2000);
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/superadmin/tenants/${id}`, { headers: authHeader() });
      setTenants((prev) => prev.filter((t) => t.id !== id));
    } catch {
      // Keep the row — deletion failed
    } finally {
      setDeleteId(null);
    }
  }

  function copySignupUrl(tenant: Tenant) {
    navigator.clipboard.writeText(signupUrl(tenant.subdomain));
    setCopiedId(tenant.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Workspaces</h1>
          <p className="text-sm text-gray-500 mt-0.5">{tenants.length} total</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Workspace
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-800" />
            ))}
          </div>
        ) : tenants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm text-gray-500">No workspaces yet.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-3 text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Create the first one →
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left text-xs text-gray-500">
                  <th className="px-5 py-3 font-medium">Workspace</th>
                  <th className="px-5 py-3 font-medium">Subdomain</th>
                  <th className="px-5 py-3 font-medium">Custom Domain</th>
                  <th className="px-5 py-3 font-medium">Support Email</th>
                  <th className="px-5 py-3 font-medium text-center">Admins</th>
                  <th className="px-5 py-3 font-medium text-center">Quizzes</th>
                  <th className="px-5 py-3 font-medium">Created</th>
                  <th className="px-5 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="font-medium text-white">{tenant.name}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <code className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-300">
                        {tenant.subdomain}
                      </code>
                    </td>
                    <td className="px-5 py-3.5">
                      {tenant.customDomain ? (
                        <span className="flex items-center gap-1.5">
                          <span className="text-gray-300">{tenant.customDomain}</span>
                          {tenant.isDomainVerified ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-gray-600" />
                          )}
                        </span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-gray-400">{tenant.supportEmail}</td>
                    <td className="px-5 py-3.5 text-center text-gray-400">{tenant._count.users}</td>
                    <td className="px-5 py-3.5 text-center text-gray-400">{tenant._count.quizzes}</td>
                    <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">
                      {new Date(tenant.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => copySignupUrl(tenant)}
                          title="Copy admin signup URL"
                          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition-colors"
                        >
                          {copiedId === tenant.id ? (
                            <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Copied</>
                          ) : (
                            <><Copy className="h-3.5 w-3.5" /> Signup URL</>
                          )}
                        </button>
                        <button
                          onClick={() => setDeleteId(tenant.id)}
                          title="Delete workspace"
                          className="rounded-md p-1.5 text-gray-600 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div ref={modalRef} className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl">
            <h2 className="text-base font-semibold text-white mb-5">New Workspace</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              {createError && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {createError}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Workspace name</label>
                <input
                  name="name"
                  type="text"
                  required
                  value={form.name}
                  onChange={handleFormChange}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3.5 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
                  placeholder="Acme Corp"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Subdomain</label>
                <div className="flex rounded-lg border border-gray-700 bg-gray-800 overflow-hidden focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition">
                  <input
                    name="subdomain"
                    type="text"
                    required
                    value={form.subdomain}
                    onChange={handleFormChange}
                    className="flex-1 bg-transparent px-3.5 py-2.5 text-sm text-white placeholder-gray-600 outline-none"
                    placeholder="acme"
                  />
                  <span className="flex items-center border-l border-gray-700 bg-gray-900/50 px-3 text-xs text-gray-500 whitespace-nowrap">
                    .{CENTRAL.split(":")[0]}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Support email</label>
                <input
                  name="supportEmail"
                  type="email"
                  required
                  value={form.supportEmail}
                  onChange={handleFormChange}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3.5 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
                  placeholder="support@acme.com"
                />
              </div>

              <hr className="border-gray-700" />
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Admin Account</p>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Admin name</label>
                <input
                  name="adminName"
                  type="text"
                  required
                  value={form.adminName}
                  onChange={handleFormChange}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3.5 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
                  placeholder="Jane Smith"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Admin email</label>
                <input
                  name="adminEmail"
                  type="email"
                  required
                  value={form.adminEmail}
                  onChange={handleFormChange}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3.5 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
                  placeholder="jane@acme.com"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setCreateError(null); }}
                  className="flex-1 rounded-lg border border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                >
                  {creating ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* One-time password reveal */}
      {createdPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl">
            <div className="mb-1 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <h2 className="text-base font-semibold text-white">Workspace created</h2>
            </div>
            <p className="text-sm text-gray-400 mb-5">
              Save this temporary password — it won't be shown again. The admin can use it to log in and change it immediately.
            </p>
            <div className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3.5 py-3 mb-5">
              <code className="flex-1 text-sm font-mono text-white break-all select-all">
                {createdPassword}
              </code>
              <button
                onClick={copyPassword}
                className="flex-shrink-0 rounded-md p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
              >
                {passwordCopied ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <button
              onClick={() => setCreatedPassword(null)}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl">
            <h2 className="text-base font-semibold text-white mb-2">Delete workspace?</h2>
            <p className="text-sm text-gray-400 mb-6">
              This will permanently delete the workspace and all associated users, quizzes, and attempts. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 rounded-lg border border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
