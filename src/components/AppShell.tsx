import type { ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Calendar,
  LayoutDashboard,
  LogOut,
  ScanLine,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/eventos", label: "Eventos", icon: Calendar, exact: false },
  { to: "/checkin", label: "Check-in", icon: ScanLine, exact: false },
  { to: "/convidados", label: "Convidados", icon: Users, exact: false },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { location } = useRouterState();
  const { user, loading, isAdmin, signOut } = useAuth();
  const { settings } = useSystemSettings();
  const navigate = useNavigate();

  const isLoginRoute = location.pathname === "/login";

  // Redireciona para login se não autenticado (exceto na própria rota /login)
  useEffect(() => {
    if (!loading && !user && !isLoginRoute) {
      navigate({ to: "/login" });
    }
  }, [loading, user, isLoginRoute, navigate]);

  if (isLoginRoute) {
    return <>{children}</>;
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
        Carregando…
      </div>
    );
  }

  const systemName = settings?.system_name ?? "Casa de Eventos";
  const logoUrl = settings?.logo_url;

  async function handleLogout() {
    await signOut();
    navigate({ to: "/login" });
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="px-6 py-7 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-2.5 group">
            {logoUrl ? (
              <img src={logoUrl} alt={systemName} className="size-9 rounded-xl object-cover shadow-[var(--shadow-glow)]" />
            ) : (
              <div className="size-9 rounded-xl flex items-center justify-center bg-[image:var(--gradient-primary)] shadow-[var(--shadow-glow)] transition-transform group-hover:scale-105">
                <Sparkles className="size-5 text-primary-foreground" />
              </div>
            )}
            <div className="leading-tight min-w-0">
              <div className="font-display font-bold text-base text-sidebar-foreground truncate">
                {systemName}
              </div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Controle de Presença
              </div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1">
          {navItems.map((item) => {
            const active = item.exact
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-[var(--transition-smooth)]",
                  active
                    ? "bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-card)]"
                    : "text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                )}
              >
                <Icon className="size-[18px]" />
                {item.label}
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              to="/admin"
              className={cn(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-[var(--transition-smooth)]",
                location.pathname.startsWith("/admin")
                  ? "bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-card)]"
                  : "text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent",
              )}
            >
              <Shield className="size-[18px]" />
              Administração
            </Link>
          )}
        </nav>

        <div className="px-3 py-4 border-t border-sidebar-border space-y-2">
          <div className="px-2 text-xs">
            <div className="text-sidebar-foreground/90 font-medium truncate">{user.email}</div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-0.5">
              {isAdmin ? "Administrador" : "Operador"}
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleLogout}>
            <LogOut className="size-4" />
            Sair
          </Button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top nav */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-sidebar-border bg-sidebar">
          <Link to="/" className="flex items-center gap-2 min-w-0">
            {logoUrl ? (
              <img src={logoUrl} alt={systemName} className="size-8 rounded-lg object-cover" />
            ) : (
              <div className="size-8 rounded-lg flex items-center justify-center bg-[image:var(--gradient-primary)]">
                <Sparkles className="size-4 text-primary-foreground" />
              </div>
            )}
            <span className="font-display font-bold truncate">{systemName}</span>
          </Link>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="size-8">
            <LogOut className="size-4" />
          </Button>
        </div>

        <div className="md:hidden flex gap-1 px-2 py-2 border-b border-sidebar-border bg-sidebar overflow-x-auto">
          {navItems.map((item) => {
            const active = item.exact
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              to="/admin"
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap",
                location.pathname.startsWith("/admin")
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent",
              )}
            >
              <Shield className="size-4" />
              Admin
            </Link>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {children}
        </div>
      </main>
    </div>
  );
}
