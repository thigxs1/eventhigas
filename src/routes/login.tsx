import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import React, { useEffect, useState, type FormEvent } from "react";
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
      toast.error(
        error.message === "Invalid login credentials"
          ? "E-mail ou senha incorretos"
          : error.message,
      );
      return;
    }
    toast.success("Bem-vindo!");
    router.invalidate();
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#121214] text-white/95 px-4 relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(circle at 24% 20%, rgba(255, 107, 0, 0.14), transparent 44%), radial-gradient(circle at 78% 82%, rgba(255, 107, 0, 0.06), transparent 50%)",
        }}
      />
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            {settings?.logo_url ? (
              <img
                src={settings.logo_url}
                alt="logo"
                className="size-12 rounded-2xl object-cover border border-white/10"
              />
            ) : (
              <div className="size-12 rounded-2xl flex items-center justify-center bg-[#FF6B00] shadow-[0_0_28px_rgba(255,107,0,0.45)]">
                <Sparkles className="size-6 text-white" aria-hidden="true" />
              </div>
            )}
          </div>
          <h1 className="text-2xl font-display font-bold tracking-tight text-white">
            {settings?.system_name ?? "Casa de Eventos"}
          </h1>
          <p className="text-sm text-white/55 mt-1">
            Acesse o painel de portaria e controle de presença
          </p>
        </div>

        <form onSubmit={onSubmit} className="glass-card p-6 sm:p-7 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white/80 text-xs font-medium">
              E-mail
            </Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="h-11 rounded-2xl bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/35 focus-visible:ring-[#FF6B00]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-white/80 text-xs font-medium">
              Senha
            </Label>
            <Input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 rounded-2xl bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/35 focus-visible:ring-[#FF6B00]"
            />
          </div>
          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-11 rounded-full bg-[#FF6B00] hover:bg-[#ff7b1c] text-white font-semibold shadow-[0_0_24px_rgba(255,107,0,0.38)]"
          >
            <LogIn className="size-4" aria-hidden="true" />
            {submitting ? "Entrando…" : "Entrar na Portaria"}
          </Button>
          <p className="text-xs text-white/45 text-center pt-2">
            Acesso restrito. Solicite uma conta ao administrador.
          </p>
        </form>
      </div>
    </div>
  );
}
