import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ThemeToggle } from "@/components/ThemeToggle";

interface FormState {
  name: string;
  email: string;
  password: string;
  subdomain: string;
}

export default function AdminSignup() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>({ name: "", email: "", password: "", subdomain: "" });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "subdomain" ? value.toLowerCase().replace(/[^a-z0-9-]/g, "") : value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/auth/admin/signup", form);
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20">
              <CheckCircle2 className="h-7 w-7 text-emerald-500" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Check your email</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We sent a verification link to <strong>{form.email}</strong>. Click it to activate your admin account.
            </p>
            <Button className="mt-6 w-full" onClick={() => navigate("/admin/login")}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 ring-1 ring-primary/30">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Create your workspace</h1>
          <p className="mt-1 text-sm text-muted-foreground">Set up your admin account and quiz portal.</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Get started</CardTitle>
            <CardDescription>Fill in the details to create your workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  required
                  autoComplete="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Jane Smith"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="jane@company.com"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="new-password"
                  minLength={8}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Minimum 8 characters"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="subdomain">Workspace subdomain</Label>
                <div className="flex rounded-lg border border-input bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition-shadow">
                  <input
                    id="subdomain"
                    name="subdomain"
                    type="text"
                    required
                    value={form.subdomain}
                    onChange={handleChange}
                    className="flex-1 min-w-0 px-3 py-2 text-sm text-foreground bg-transparent outline-none placeholder:text-muted-foreground"
                    placeholder="acme"
                  />
                  <span className="flex items-center bg-muted px-3 text-sm text-muted-foreground border-l border-input whitespace-nowrap">
                    .microskill.ai
                  </span>
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Creating workspace…" : "Create workspace"}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/admin/login" className="font-medium text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
