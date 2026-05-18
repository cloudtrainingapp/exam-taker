import { useEffect, useState } from "react";
import { Plus, Trash2, Copy, CheckCircle2, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

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

  useEffect(() => { fetchTenants(); }, []);

  function fetchTenants() {
    setLoading(true);
    api.get<Tenant[]>("/superadmin/tenants", { headers: authHeader() })
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
      // deletion failed — keep row
    } finally {
      setDeleteId(null);
    }
  }

  function copySignupUrl(tenant: Tenant) {
    const isProd = import.meta.env.PROD;
    const proto = isProd ? "https" : "http";
    navigator.clipboard.writeText(`${proto}://${tenant.subdomain}.${CENTRAL}/admin/signup`);
    setCopiedId(tenant.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Workspaces</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{tenants.length} total</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> New Workspace
        </Button>
      </div>

      <Card>
        {loading ? (
          <CardContent className="space-y-3 pt-6">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </CardContent>
        ) : tenants.length === 0 ? (
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm text-muted-foreground">No workspaces yet.</p>
            <button onClick={() => setShowCreate(true)} className="mt-3 text-sm font-medium text-primary hover:underline">
              Create the first one →
            </button>
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workspace</TableHead>
                <TableHead>Subdomain</TableHead>
                <TableHead>Custom Domain</TableHead>
                <TableHead>Support Email</TableHead>
                <TableHead className="text-center">Admins</TableHead>
                <TableHead className="text-center">Quizzes</TableHead>
                <TableHead>Created</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((tenant) => (
                <TableRow key={tenant.id} className="group">
                  <TableCell className="font-medium text-foreground">{tenant.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono text-xs">{tenant.subdomain}</Badge>
                  </TableCell>
                  <TableCell>
                    {tenant.customDomain ? (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        {tenant.customDomain}
                        {tenant.isDomainVerified
                          ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          : <XCircle className="h-3.5 w-3.5 text-muted-foreground/50" />
                        }
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{tenant.supportEmail}</TableCell>
                  <TableCell className="text-center text-muted-foreground">{tenant._count.users}</TableCell>
                  <TableCell className="text-center text-muted-foreground">{tenant._count.quizzes}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {new Date(tenant.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={() => copySignupUrl(tenant)}>
                        {copiedId === tenant.id ? <><CheckCircle2 className="h-3 w-3 text-emerald-500" /> Copied</> : <><Copy className="h-3 w-3" /> Signup URL</>}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteId(tenant.id)}>
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
            <DialogTitle>New Workspace</DialogTitle>
            <DialogDescription>Create a new tenant workspace.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 mt-2">
            {createError && <Alert variant="destructive"><AlertDescription>{createError}</AlertDescription></Alert>}

            <div className="space-y-1.5">
              <Label>Workspace name</Label>
              <Input name="name" type="text" required value={form.name} onChange={handleFormChange} placeholder="Acme Corp" />
            </div>
            <div className="space-y-1.5">
              <Label>Subdomain</Label>
              <div className="flex rounded-lg border border-input bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                <input
                  name="subdomain"
                  type="text"
                  required
                  value={form.subdomain}
                  onChange={handleFormChange}
                  className="flex-1 min-w-0 px-3 py-2 text-sm text-foreground bg-transparent outline-none placeholder:text-muted-foreground"
                  placeholder="acme"
                />
                <span className="flex items-center bg-muted px-3 text-xs text-muted-foreground border-l border-input whitespace-nowrap">
                  .{CENTRAL.split(":")[0]}
                </span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Support email</Label>
              <Input name="supportEmail" type="email" required value={form.supportEmail} onChange={handleFormChange} placeholder="support@acme.com" />
            </div>

            <Separator />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Admin Account</p>

            <div className="space-y-1.5">
              <Label>Admin name</Label>
              <Input name="adminName" type="text" required value={form.adminName} onChange={handleFormChange} placeholder="Jane Smith" />
            </div>
            <div className="space-y-1.5">
              <Label>Admin email</Label>
              <Input name="adminEmail" type="email" required value={form.adminEmail} onChange={handleFormChange} placeholder="jane@acme.com" />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowCreate(false); setCreateError(null); }}>Cancel</Button>
              <Button type="submit" disabled={creating}>{creating ? "Creating…" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Password reveal dialog */}
      <Dialog open={!!createdPassword} onOpenChange={(open) => { if (!open) setCreatedPassword(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Workspace created
            </DialogTitle>
            <DialogDescription>
              Save this temporary password — it won't be shown again. The admin can log in and change it immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3.5 py-3">
            <code className="flex-1 text-sm font-mono text-foreground break-all select-all">{createdPassword}</code>
            <Button variant="ghost" size="icon" className="flex-shrink-0 h-7 w-7" onClick={copyPassword}>
              {passwordCopied ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <DialogFooter>
            <Button className="w-full" onClick={() => setCreatedPassword(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete workspace?</DialogTitle>
            <DialogDescription>
              This will permanently delete the workspace and all associated users, quizzes, and attempts. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
