import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Sparkles, LogIn, Key, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";

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
    const cleanEmail = email.trim().toLowerCase();
    const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
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
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-accent/20 blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2, bounce: 0.5 }}
            className="inline-flex items-center gap-3 mb-6 relative group"
          >
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt="logo" className="size-20 rounded-2xl object-cover shadow-[var(--shadow-glow)] transition-transform duration-500 group-hover:scale-105" />
            ) : (
              <div className="size-20 rounded-2xl flex items-center justify-center bg-[image:var(--gradient-primary)] shadow-[var(--shadow-glow)] transition-transform duration-500 group-hover:scale-105">
                <Sparkles className="size-10 text-primary-foreground" />
              </div>
            )}
          </motion.div>
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70"
          >
            {settings?.system_name ?? "Casa de Eventos"}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-sm text-muted-foreground mt-2"
          >
            Faça login para acessar o painel
          </motion.p>
        </div>

        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          onSubmit={onSubmit}
          className="rounded-3xl border border-white/5 bg-surface/40 backdrop-blur-xl shadow-2xl p-8 space-y-5"
        >
          <div className="space-y-3">
            <Label htmlFor="email" className="text-muted-foreground">E-mail</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="pl-10 bg-black/20 border-white/10 focus-visible:border-primary transition-colors h-11"
              />
            </div>
          </div>
          <div className="space-y-3">
            <Label htmlFor="password" className="text-muted-foreground">Senha</Label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 bg-black/20 border-white/10 focus-visible:border-primary transition-colors h-11"
                placeholder="••••••••"
              />
            </div>
          </div>
          <Button type="submit" disabled={submitting} className="w-full h-11 text-base shadow-[var(--shadow-glow)] mt-2">
            <LogIn className="size-4 mr-2" />
            {submitting ? "Autenticando…" : "Entrar no Sistema"}
          </Button>
          <p className="text-xs text-muted-foreground text-center pt-4">
            Acesso restrito a organizadores.
          </p>
        </motion.form>
      </motion.div>
    </div>
  );
}

