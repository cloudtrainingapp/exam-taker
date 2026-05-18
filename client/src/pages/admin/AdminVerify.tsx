import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";

type Status = "verifying" | "success" | "error";

export default function AdminVerify() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("verifying");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setMessage("Verification link is missing a token.");
      return;
    }

    api
      .post<{ message: string }>("/auth/admin/verify", { token })
      .then(({ message }) => {
        setMessage(message);
        setStatus("success");
      })
      .catch((err: unknown) => {
        setMessage(err instanceof Error ? err.message : "Verification failed.");
        setStatus("error");
      });
  }, [searchParams]);

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-sm">
        <CardContent className="pt-8 pb-8 text-center">
          {status === "verifying" && (
            <>
              <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Verifying your account…</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20">
                <CheckCircle2 className="h-7 w-7 text-emerald-500" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Email verified</h2>
              <p className="mt-1 text-sm text-muted-foreground">{message}</p>
              <Button className="mt-6 w-full" onClick={() => navigate("/admin/login", { replace: true })}>
                Go to Login
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/20">
                <XCircle className="h-7 w-7 text-destructive" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Verification failed</h2>
              <p className="mt-1 text-sm text-muted-foreground">{message}</p>
              <Button variant="secondary" className="mt-6 w-full" onClick={() => navigate("/admin/signup", { replace: true })}>
                Back to Sign Up
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
