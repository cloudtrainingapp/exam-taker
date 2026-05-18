import { useEffect, useState } from "react";
import { api } from "../../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("admin_token")}` };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({ title, description, children }: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
      <div className="border-b border-gray-800 px-6 py-4">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function SaveButton({ saving, label = "Save changes" }: { saving: boolean; label?: string }) {
  return (
    <button
      type="submit"
      disabled={saving}
      className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50 transition-colors"
    >
      {saving ? "Saving…" : label}
    </button>
  );
}

function SuccessBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
      <span>{message}</span>
      <button onClick={onDismiss} className="ml-4 text-emerald-500 hover:text-emerald-300">✕</button>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
      {message}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<TenantSettings | null>(null);
  const [user, setUser] = useState<UserSettings | null>(null);

  // Workspace form
  const [wsName, setWsName] = useState("");
  const [wsCustomDomain, setWsCustomDomain] = useState("");
  const [wsSaving, setWsSaving] = useState(false);
  const [wsError, setWsError] = useState<string | null>(null);
  const [wsSuccess, setWsSuccess] = useState<string | null>(null);

  // Email form
  const [emSupportEmail, setEmSupportEmail] = useState("");
  const [emSubject, setEmSubject] = useState("");
  const [emTemplate, setEmTemplate] = useState("");
  const [emToggle, setEmToggle] = useState(true);
  const [emSaving, setEmSaving] = useState(false);
  const [emError, setEmError] = useState<string | null>(null);
  const [emSuccess, setEmSuccess] = useState<string | null>(null);

  // Password form
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

  // ── Workspace save ─────────────────────────────────────────────────────────

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

  // ── Email save ─────────────────────────────────────────────────────────────

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

  // ── Password save ──────────────────────────────────────────────────────────

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

  // ── Loading skeleton ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-6 w-32 animate-pulse rounded bg-gray-800" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-48 animate-pulse rounded-xl bg-gray-800" />
        ))}
      </div>
    );
  }

  const inputCls = "w-full rounded-lg border border-gray-700 bg-gray-800 px-3.5 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition";
  const labelCls = "block text-xs font-medium text-gray-400 mb-1.5";

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Settings</h1>
        {user && <p className="text-sm text-gray-500 mt-0.5">{user.name} · {user.email}</p>}
      </div>

      {/* ── Workspace ── */}
      <SectionCard
        title="Workspace"
        description="Your workspace name and domain configuration."
      >
        <form onSubmit={handleWorkspace} className="space-y-4">
          {wsError && <ErrorBanner message={wsError} />}
          {wsSuccess && <SuccessBanner message={wsSuccess} onDismiss={() => setWsSuccess(null)} />}

          <div>
            <label className={labelCls}>Workspace Name</label>
            <input
              type="text" required value={wsName} onChange={(e) => setWsName(e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Subdomain</label>
            <input
              type="text" readOnly value={tenant?.subdomain ?? ""}
              className={`${inputCls} cursor-not-allowed opacity-50`}
            />
            <p className="mt-1.5 text-xs text-gray-600">Subdomain cannot be changed after creation.</p>
          </div>

          <div>
            <label className={labelCls}>Custom Domain <span className="text-gray-600">(optional)</span></label>
            <input
              type="text" value={wsCustomDomain} onChange={(e) => setWsCustomDomain(e.target.value)}
              placeholder="app.yourdomain.com"
              className={inputCls}
            />
            {tenant?.customDomain && (
              <p className={`mt-1.5 text-xs ${tenant.isDomainVerified ? "text-emerald-500" : "text-amber-500"}`}>
                {tenant.isDomainVerified ? "✓ Domain verified" : "⚠ Domain not yet verified — point your DNS CNAME to this workspace's subdomain."}
              </p>
            )}
          </div>

          <div className="flex justify-end pt-1">
            <SaveButton saving={wsSaving} />
          </div>
        </form>
      </SectionCard>

      {/* ── Email ── */}
      <SectionCard
        title="Email"
        description="Verification emails sent to new admin sign-ups."
      >
        <form onSubmit={handleEmail} className="space-y-4">
          {emError && <ErrorBanner message={emError} />}
          {emSuccess && <SuccessBanner message={emSuccess} onDismiss={() => setEmSuccess(null)} />}

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Send verification emails</p>
              <p className="text-xs text-gray-500 mt-0.5">Toggle off to skip email verification for new sign-ups.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={emToggle}
              onClick={() => setEmToggle((v) => !v)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                emToggle ? "bg-violet-600" : "bg-gray-700"
              }`}
            >
              <span
                className="inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200"
                style={{ transform: emToggle ? "translateX(22px)" : "translateX(2px)", marginTop: "2px" }}
              />
            </button>
          </div>

          <div>
            <label className={labelCls}>Support / Sender Email</label>
            <input
              type="email" required value={emSupportEmail} onChange={(e) => setEmSupportEmail(e.target.value)}
              placeholder="noreply@yourdomain.com"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Email Subject <span className="text-gray-600">(optional)</span></label>
            <input
              type="text" value={emSubject} onChange={(e) => setEmSubject(e.target.value)}
              placeholder="Verify your account"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>
              Email Body Template <span className="text-gray-600">(optional)</span>
            </label>
            <textarea
              value={emTemplate} onChange={(e) => setEmTemplate(e.target.value)}
              rows={5}
              placeholder={"Hi {{name}},\n\nClick here to verify your account: {{verificationUrl}}\n\nThanks,\nThe Team"}
              className={`${inputCls} resize-y font-mono text-xs`}
            />
            <p className="mt-1.5 text-xs text-gray-600">
              Available variables: <code className="text-gray-400">{"{{name}}"}</code>, <code className="text-gray-400">{"{{verificationUrl}}"}</code>
            </p>
          </div>

          <div className="flex justify-end pt-1">
            <SaveButton saving={emSaving} />
          </div>
        </form>
      </SectionCard>

      {/* ── Password ── */}
      <SectionCard
        title="Password"
        description="Change your admin account password."
      >
        <form onSubmit={handlePassword} className="space-y-4">
          {pwError && <ErrorBanner message={pwError} />}
          {pwSuccess && <SuccessBanner message={pwSuccess} onDismiss={() => setPwSuccess(null)} />}

          <div>
            <label className={labelCls}>Current Password</label>
            <input
              type="password" required value={pwCurrent} onChange={(e) => setPwCurrent(e.target.value)}
              className={inputCls} autoComplete="current-password"
            />
          </div>

          <div>
            <label className={labelCls}>New Password</label>
            <input
              type="password" required minLength={8} value={pwNew} onChange={(e) => setPwNew(e.target.value)}
              className={inputCls} autoComplete="new-password"
            />
            <p className="mt-1.5 text-xs text-gray-600">Minimum 8 characters.</p>
          </div>

          <div>
            <label className={labelCls}>Confirm New Password</label>
            <input
              type="password" required value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)}
              className={inputCls} autoComplete="new-password"
            />
          </div>

          <div className="flex justify-end pt-1">
            <SaveButton saving={pwSaving} label="Update password" />
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
