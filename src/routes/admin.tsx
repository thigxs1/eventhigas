import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Palette, Save, TicketCheck, Trash2, Upload, UserPlus, Users, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { THEMES, type ThemeId } from "@/lib/themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Administração — Sistema" }] }),
  component: AdminPage,
});

type ManagedUser = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  roles: string[];
};

function AdminPage() {
  const { isAdmin, loading: authLoading, user } = useAuth();
  const { settings, refresh } = useSystemSettings();
  const navigate = useNavigate();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [systemName, setSystemName] = useState("");
  const [theme, setTheme] = useState<ThemeId>("midnight-indigo");
  const [ticketTypes, setTicketTypes] = useState<string[]>([]);
  const [newType, setNewType] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error("Acesso restrito a administradores");
      navigate({ to: "/" });
    }
  }, [authLoading, isAdmin, navigate]);

  useEffect(() => {
    if (settings) {
      setSystemName(settings.system_name);
      setTheme((settings.theme as ThemeId) ?? "midnight-indigo");
      setTicketTypes(settings.ticket_types ?? []);
    }
  }, [settings]);

  async function loadUsers() {
    setLoadingUsers(true);
    const { data: profiles } = await supabase.from("profiles").select("id,display_name,avatar_url");
    const { data: roles } = await supabase.from("user_roles").select("user_id,role");
    const rolesByUser = new Map<string, string[]>();
    for (const r of roles ?? []) {
      const arr = rolesByUser.get(r.user_id) ?? [];
      arr.push(r.role);
      rolesByUser.set(r.user_id, arr);
    }
    setUsers(
      (profiles ?? []).map((p) => ({
        id: p.id,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        roles: rolesByUser.get(p.id) ?? [],
      })),
    );
    setLoadingUsers(false);
  }

  useEffect(() => {
    if (isAdmin) loadUsers();
  }, [isAdmin]);

  async function saveSettings() {
    if (!settings) return;
    setSavingSettings(true);
    const { error } = await supabase
      .from("system_settings")
      .update({
        system_name: systemName.trim() || "Casa de Eventos",
        theme,
        ticket_types: ticketTypes,
      })
      .eq("id", settings.id);
    setSavingSettings(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Configurações salvas");
    refresh();
  }

  async function uploadLogo(file: File) {
    if (!settings) return;
    const ext = file.name.split(".").pop() || "png";
    const path = `logo-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("branding").upload(path, file, { upsert: true });
    if (upErr) {
      toast.error(upErr.message);
      return;
    }
    const { data } = supabase.storage.from("branding").getPublicUrl(path);
    const { error } = await supabase.from("system_settings").update({ logo_url: data.publicUrl }).eq("id", settings.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Logo atualizado");
    refresh();
  }

  async function removeLogo() {
    if (!settings) return;
    const { error } = await supabase.from("system_settings").update({ logo_url: null }).eq("id", settings.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Logo removido");
    refresh();
  }

  async function toggleRole(userId: string, role: "admin" | "operator", has: boolean) {
    if (has) {
      if (role === "admin" && userId === user?.id) {
        toast.error("Você não pode remover seu próprio acesso de admin");
        return;
      }
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) return toast.error(error.message);
    }
    loadUsers();
  }

  async function deleteUser(userId: string) {
    if (userId === user?.id) {
      toast.error("Você não pode excluir sua própria conta");
      return;
    }
    // Remove perfil (cascata remove roles via FK do auth.users? não — RLS apenas)
    // Como não temos delete admin do auth pelo client, removemos perfil + roles (usuário fica sem acesso ao sistema)
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase.from("profiles").delete().eq("id", userId);
    if (error) return toast.error(error.message);
    toast.success("Acesso revogado");
    loadUsers();
  }

  if (authLoading || !isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="px-5 md:px-8 py-7 md:py-9 max-w-[1200px] mx-auto space-y-8">
      <div>
        <h1 className="font-display font-bold text-2xl md:text-3xl">Painel de Administração</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie usuários, identidade visual e tema do sistema.</p>
      </div>

      {/* Branding */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
          <Palette className="size-4 text-primary" /> Identidade do sistema
        </h2>
        <div className="grid md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label>Nome do sistema</Label>
            <Input value={systemName} onChange={(e) => setSystemName(e.target.value)} placeholder="Casa de Eventos" />
            <p className="text-xs text-muted-foreground">Aparece no menu lateral, login e título.</p>
          </div>
          <div className="space-y-2">
            <Label>Tema visual</Label>
            <Select value={theme} onValueChange={(v) => setTheme(v as ThemeId)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(THEMES).map(([id, t]) => (
                  <SelectItem key={id} value={id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">A pré-visualização aplica imediatamente após salvar.</p>
          </div>
          <div className="space-y-4 md:col-span-2 border-t border-border pt-6">
            <Label className="flex items-center gap-2">
              <TicketCheck className="size-4" /> Tipos de ingressos permitidos
            </Label>
            <div className="flex flex-wrap gap-2 mb-3">
              {ticketTypes.map((type, i) => (
                <Badge key={i} variant="secondary" className="gap-1 px-2 py-1">
                  {type}
                  <button
                    type="button"
                    onClick={() => setTicketTypes(ticketTypes.filter((_, idx) => idx !== i))}
                    className="hover:text-destructive transition-colors"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
              {ticketTypes.length === 0 && (
                <span className="text-xs text-muted-foreground italic">Nenhum tipo definido.</span>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                placeholder="Ex: VIP, Cortesia..."
                className="max-w-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (newType.trim()) {
                      setTicketTypes([...ticketTypes, newType.trim()]);
                      setNewType("");
                    }
                  }
                }}
              />
              <Button
                variant="outline"
                onClick={() => {
                  if (newType.trim()) {
                    setTicketTypes([...ticketTypes, newType.trim()]);
                    setNewType("");
                  }
                }}
              >
                Adicionar
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Esses tipos aparecerão para os operadores ao aprovar novos convidados.
            </p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Ícone / Logo</Label>
            <div className="flex items-center gap-4">
              {settings?.logo_url ? (
                <img src={settings.logo_url} alt="logo" className="size-16 rounded-xl object-cover border border-border" />
              ) : (
                <div className="size-16 rounded-xl bg-surface border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground">
                  sem logo
                </div>
              )}
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-background text-sm font-medium cursor-pointer hover:bg-accent">
                <Upload className="size-4" /> Trocar
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadLogo(f);
                  }}
                />
              </label>
              {settings?.logo_url && (
                <Button variant="ghost" size="sm" onClick={removeLogo}>
                  Remover
                </Button>
              )}
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <Button onClick={saveSettings} disabled={savingSettings}>
            <Save className="size-4" /> Salvar alterações
          </Button>
        </div>
      </section>

      {/* Usuários */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="font-display font-semibold text-lg flex items-center gap-2">
            <Users className="size-4 text-primary" /> Usuários do sistema
          </h2>
          <CreateUserDialog onCreated={loadUsers} />
        </div>

        {loadingUsers ? (
          <div className="text-sm text-muted-foreground py-6 text-center">Carregando…</div>
        ) : users.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">Nenhum usuário ainda.</div>
        ) : (
          <ul className="divide-y divide-border">
            {users.map((u) => {
              const isAdminUser = u.roles.includes("admin");
              const isOperator = u.roles.includes("operator");
              return (
                <li key={u.id} className="py-3 flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{u.display_name ?? "Sem nome"}</div>
                    <div className="text-xs text-muted-foreground flex gap-1.5 mt-1">
                      {isAdminUser && <Badge className="bg-primary/15 text-primary border-0">Admin</Badge>}
                      {isOperator && <Badge variant="secondary">Operador</Badge>}
                      {!isAdminUser && !isOperator && <span>sem papéis</span>}
                      {u.id === user?.id && <Badge variant="outline">Você</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant={isAdminUser ? "default" : "outline"}
                      onClick={() => toggleRole(u.id, "admin", isAdminUser)}
                    >
                      Admin
                    </Button>
                    <Button
                      size="sm"
                      variant={isOperator ? "default" : "outline"}
                      onClick={() => toggleRole(u.id, "operator", isOperator)}
                    >
                      Operador
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="text-destructive">
                          <Trash2 className="size-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Revogar acesso?</AlertDialogTitle>
                          <AlertDialogDescription>
                            O usuário perderá acesso ao sistema. Esta ação remove o perfil e todos os papéis.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteUser(u.id)}>Revogar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function CreateUserDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "operator">("operator");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Senha deve ter pelo menos 6 caracteres");
      return;
    }
    setSubmitting(true);
    // Cria via signUp — auto-confirm está habilitado
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: name } },
    });
    if (error || !data.user) {
      setSubmitting(false);
      toast.error(error?.message ?? "Falha ao criar usuário");
      return;
    }
    // Atribuir papel
    await supabase.from("user_roles").insert({ user_id: data.user.id, role });
    // garantir display_name
    await supabase.from("profiles").update({ display_name: name }).eq("id", data.user.id);
    setSubmitting(false);
    toast.success("Usuário criado");
    setOpen(false);
    setName("");
    setEmail("");
    setPassword("");
    setRole("operator");
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="size-4" /> Novo usuário
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar novo usuário</DialogTitle>
          <DialogDescription>O usuário poderá entrar imediatamente com o e-mail e senha definidos.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Senha</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
          </div>
          <div className="space-y-2">
            <Label>Papel</Label>
            <Select value={role} onValueChange={(v) => setRole(v as "admin" | "operator")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="operator">Operador</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Criando…" : "Criar usuário"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
