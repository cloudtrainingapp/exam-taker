import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, X } from "lucide-react";

interface TenantSettings {
  name: string;
  subdomain: string;
  customDomain: string | null;
  isDomainVerified: boolean;
  supportEmail: string;
  emailSubject: string | null;
  emailTemplate: string | null;
  sendEmailToggle: boolean;
}

interface UserSettings {
  name: string;
  email: string;
}

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("admin_token")}` };
}

function SuccessBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
        <span>{message}</span>
      </div>
      <button onClick={onDismiss} className="ml-4 opacity-70 hover:opacity-100 transition-opacity">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<TenantSettings | null>(null);
  const [user, setUser] = useState<UserSettings | null>(null);

  const [wsName, setWsName] = useState("");
  const [wsCustomDomain, setWsCustomDomain] = useState("");
  const [wsSaving, setWsSaving] = useState(false);
  const [wsError, setWsError] = useState<string | null>(null);
  const [wsSuccess, setWsSuccess] = useState<string | null>(null);

  const [emSupportEmail, setEmSupportEmail] = useState("");
  const [emSubject, setEmSubject] = useState("");
  const [emTemplate, setEmTemplate] = useState("");
  const [emToggle, setEmToggle] = useState(true);
  const [emSaving, setEmSaving] = useState(false);
  const [emError, setEmError] = useState<string | null>(null);
  const [emSuccess, setEmSuccess] = useState<string | null>(null);

  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ tenant: TenantSettings; user: UserSettings }>("/admin/settings", { headers: authHeader() })
      .then(({ tenant, user }) => {
        setTenant(tenant);
        setUser(user);
        setWsName(tenant.name);
        setWsCustomDomain(tenant.customDomain ?? "");
        setEmSupportEmail(tenant.supportEmail);
        setEmSubject(tenant.emailSubject ?? "");
        setEmTemplate(tenant.emailTemplate ?? "");
        setEmToggle(tenant.sendEmailToggle);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleWorkspace(e: React.FormEvent) {
    e.preventDefault();
    setWsError(null); setWsSuccess(null);
    setWsSaving(true);
    try {
      const updated = await api.patch<TenantSettings>("/admin/settings/workspace", {
        name: wsName,
        customDomain: wsCustomDomain.trim() || null,
      }, { headers: authHeader() });
      setTenant((t) => t ? { ...t, ...updated } : t);
      setWsSuccess("Workspace settings saved.");
    } catch (err: unknown) {
      setWsError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setWsSaving(false);
    }
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmError(null); setEmSuccess(null);
    setEmSaving(true);
    try {
      const updated = await api.patch<Partial<TenantSettings>>("/admin/settings/email", {
        supportEmail: emSupportEmail,
        emailSubject: emSubject || null,
        emailTemplate: emTemplate || null,
        sendEmailToggle: emToggle,
      }, { headers: authHeader() });
      setTenant((t) => t ? { ...t, ...updated } : t);
      setEmSuccess("Email settings saved.");
    } catch (err: unknown) {
      setEmError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setEmSaving(false);
    }
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null); setPwSuccess(null);
    if (pwNew !== pwConfirm) {
      setPwError("New passwords do not match");
      return;
    }
    setPwSaving(true);
    try {
      await api.patch("/admin/settings/password", {
        currentPassword: pwCurrent,
        newPassword: pwNew,
      }, { headers: authHeader() });
      setPwSuccess("Password updated successfully.");
      setPwCurrent(""); setPwNew(""); setPwConfirm("");
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setPwSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 space-y-6 max-w-2xl">
        <Skeleton className="h-6 w-32" />
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        {user && <p className="text-sm text-muted-foreground mt-0.5">{user.name} · {user.email}</p>}
      </div>

      {/* Workspace */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Workspace</CardTitle>
          <CardDescription>Your workspace name and domain configuration.</CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          <form onSubmit={handleWorkspace} className="space-y-4">
            {wsError && <Alert variant="destructive"><AlertDescription>{wsError}</AlertDescription></Alert>}
            {wsSuccess && <SuccessBanner message={wsSuccess} onDismiss={() => setWsSuccess(null)} />}

            <div className="space-y-1.5">
              <Label>Workspace Name</Label>
              <Input type="text" required value={wsName} onChange={(e) => setWsName(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Subdomain</Label>
              <Input type="text" readOnly value={tenant?.subdomain ?? ""} className="cursor-not-allowed opacity-50" />
              <p className="text-xs text-muted-foreground">Subdomain cannot be changed after creation.</p>
            </div>

            <div className="space-y-1.5">
              <Label>Custom Domain <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                type="text"
                value={wsCustomDomain}
                onChange={(e) => setWsCustomDomain(e.target.value)}
                placeholder="app.yourdomain.com"
              />
              {tenant?.customDomain && (
                <p className={`text-xs ${tenant.isDomainVerified ? "text-emerald-500" : "text-amber-500"}`}>
                  {tenant.isDomainVerified ? "✓ Domain verified" : "⚠ Domain not yet verified — point your DNS CNAME to this workspace's subdomain."}
                </p>
              )}
            </div>

            <div className="flex justify-end pt-1">
              <Button type="submit" disabled={wsSaving}>{wsSaving ? "Saving…" : "Save changes"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Email */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Email</CardTitle>
          <CardDescription>Verification emails sent to new admin sign-ups.</CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          <form onSubmit={handleEmail} className="space-y-4">
            {emError && <Alert variant="destructive"><AlertDescription>{emError}</AlertDescription></Alert>}
            {emSuccess && <SuccessBanner message={emSuccess} onDismiss={() => setEmSuccess(null)} />}

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Send verification emails</p>
                <p className="text-xs text-muted-foreground mt-0.5">Toggle off to skip email verification for new sign-ups.</p>
              </div>
              <Switch checked={emToggle} onCheckedChange={setEmToggle} />
            </div>

            <Separator />

            <div className="space-y-1.5">
              <Label>Support / Sender Email</Label>
              <Input
                type="email"
                required
                value={emSupportEmail}
                onChange={(e) => setEmSupportEmail(e.target.value)}
                placeholder="noreply@yourdomain.com"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Email Subject <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                type="text"
                value={emSubject}
                onChange={(e) => setEmSubject(e.target.value)}
                placeholder="Verify your account"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Email Body Template <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea
                value={emTemplate}
                onChange={(e) => setEmTemplate(e.target.value)}
                rows={5}
                placeholder={"Hi {{name}},\n\nClick here to verify your account: {{verificationUrl}}\n\nThanks,\nThe Team"}
                className="font-mono text-xs resize-y"
              />
              <p className="text-xs text-muted-foreground">
                Available variables: <code className="text-foreground">{"{{name}}"}</code>, <code className="text-foreground">{"{{verificationUrl}}"}</code>
              </p>
            </div>

            <div className="flex justify-end pt-1">
              <Button type="submit" disabled={emSaving}>{emSaving ? "Saving…" : "Save changes"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Password</CardTitle>
          <CardDescription>Change your admin account password.</CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          <form onSubmit={handlePassword} className="space-y-4">
            {pwError && <Alert variant="destructive"><AlertDescription>{pwError}</AlertDescription></Alert>}
            {pwSuccess && <SuccessBanner message={pwSuccess} onDismiss={() => setPwSuccess(null)} />}

            <div className="space-y-1.5">
              <Label>Current Password</Label>
              <Input type="password" required value={pwCurrent} onChange={(e) => setPwCurrent(e.target.value)} autoComplete="current-password" />
            </div>

            <div className="space-y-1.5">
              <Label>New Password</Label>
              <Input type="password" required minLength={8} value={pwNew} onChange={(e) => setPwNew(e.target.value)} autoComplete="new-password" />
              <p className="text-xs text-muted-foreground">Minimum 8 characters.</p>
            </div>

            <div className="space-y-1.5">
              <Label>Confirm New Password</Label>
              <Input type="password" required value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)} autoComplete="new-password" />
            </div>

            <div className="flex justify-end pt-1">
              <Button type="submit" disabled={pwSaving}>{pwSaving ? "Saving…" : "Update password"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
