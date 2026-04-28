import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Sparkles, LogIn } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar — Casa de Eventos" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { user, loading } = useAuth();
  const { settings } = useSystemSettings();
  const navigate = useNavigate();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: "/" });
    }
  }, [user, loading, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "E-mail ou senha incorretos" : error.message);
      return;
    }
    toast.success("Bem-vindo!");
    router.invalidate();
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt="logo" className="size-12 rounded-xl object-cover" />
            ) : (
              <div className="size-12 rounded-xl flex items-center justify-center bg-[image:var(--gradient-primary)] shadow-[var(--shadow-glow)]">
                <Sparkles className="size-6 text-primary-foreground" />
              </div>
            )}
          </div>
          <h1 className="text-2xl font-display font-bold">{settings?.system_name ?? "Casa de Eventos"}</h1>
          <p className="text-sm text-muted-foreground mt-1">Entre para acessar o sistema</p>
        </div>

        <form onSubmit={onSubmit} className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={submitting} className="w-full">
            <LogIn className="size-4" />
            {submitting ? "Entrando…" : "Entrar"}
          </Button>
          <p className="text-xs text-muted-foreground text-center pt-2">
            Acesso restrito. Solicite uma conta ao administrador.
          </p>
        </form>
      </div>
    </div>
  );
}
