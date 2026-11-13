import React, { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  LayoutDashboard,
  Lock,
  LogOut,
  QrCode,
  Settings,
  Shield,
  Sparkles,
  Unlock,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const primaryNavItems = [
  { id: "dashboard", to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { id: "guests", to: "/convidados", label: "Lista de Convidados", icon: Users, exact: false },
  { id: "qr", to: "/checkin", label: "Leitor de QR Code", icon: QrCode, exact: false },
  {
    id: "occupancy",
    to: "/eventos",
    label: "Relatório de Lotação",
    icon: BarChart3,
    exact: false,
  },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { location } = useRouterState();
  const { user, loading, isAdmin, signOut } = useAuth();
  const { settings } = useSystemSettings();
  const navigate = useNavigate();
  const [operatorModalOpen, setOperatorModalOpen] = useState(false);
  const [strictMode, setStrictMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const saved = window.localStorage.getItem("checkin_strict_mode");
    return saved === null ? true : saved === "true";
  });

  const isLoginRoute = location.pathname === "/login";
  const isPublicRoute = isLoginRoute || location.pathname.startsWith("/inscrever");

  useEffect(() => {
    if (!loading && !user && !isPublicRoute) {
      navigate({ to: "/login" });
    }
  }, [loading, user, isPublicRoute, navigate]);

  function toggleStrictMode() {
    setStrictMode((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        window.localStorage.setItem("checkin_strict_mode", String(next));
      }
      return next;
    });
  }

  if (isPublicRoute) {
    return <>{children}</>;
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#121214] text-white/60 text-sm">
        <div className="flex items-center gap-3 px-5 py-3 glass-card">
          <span className="size-2.5 rounded-full bg-[#FF6B00] animate-pulse shadow-[0_0_12px_rgba(255,107,0,0.8)]" />
          <span>Inicializando portaria…</span>
        </div>
      </div>
    );
  }

  const systemName = settings?.system_name ?? "Casa de Eventos";
  const logoUrl = settings?.logo_url;
  const isConfigActive = location.pathname.startsWith("/admin");

  async function handleLogout() {
    await signOut();
    navigate({ to: "/login" });
  }

  function isItemActive(to: string, exact: boolean) {
    return exact ? location.pathname === to : location.pathname.startsWith(to);
  }

  return (
    <div className="min-h-screen bg-[#121214] text-white/95 p-3 md:p-4 flex gap-4 relative overflow-x-clip">
      {/* Ambient radial lighting behind the glass architecture */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(circle at 14% 16%, rgba(255, 107, 0, 0.14), transparent 38%), radial-gradient(circle at 86% 78%, rgba(255, 107, 0, 0.06), transparent 45%), radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.03), transparent 55%)",
        }}
      />

      {/* Floating Left Icon-Only Sidebar (88px wide, 16px margin from edges, rounded-28px) */}
      <aside
        aria-label="Navegação principal"
        className="hidden md:flex w-[88px] shrink-0 flex-col items-center justify-between py-6 px-3 sticky top-4 h-[calc(100vh-32px)] rounded-[28px] z-20"
        style={{
          background: "rgba(18, 18, 22, 0.72)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.3)",
        }}
      >
        {/* Top Minimal Brand Emblem */}
        <Link
          to="/"
          aria-label={systemName}
          title={systemName}
          className="group relative size-12 rounded-[18px] flex items-center justify-center transition-transform duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00]"
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={systemName}
              className="size-11 rounded-[16px] object-cover border border-white/10"
            />
          ) : (
            <div className="size-11 rounded-[16px] bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-white group-hover:border-[#FF6B00]/50 transition-colors">
              <Sparkles className="size-5 stroke-[1.65]" aria-hidden="true" />
            </div>
          )}
        </Link>

        {/* Centered Column of Outline Icons (No Text) */}
        <nav className="flex flex-col items-center gap-3" aria-label="Menu da portaria">
          {primaryNavItems.map((item) => {
            const active = isItemActive(item.to, item.exact);
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                to={item.to}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative size-12 rounded-[18px] flex items-center justify-center transition-all duration-200 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00]",
                  active
                    ? "bg-[#FF6B00]/15 text-[#FF6B00] border-[#FF6B00]/40 shadow-[0_0_24px_rgba(255,107,0,0.38)]"
                    : "bg-transparent text-white/50 border-transparent hover:text-white/95 hover:bg-white/[0.05] hover:border-white/[0.08]",
                )}
              >
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute -left-3 w-1 h-5 rounded-r-full bg-[#FF6B00] shadow-[0_0_12px_#FF6B00]"
                  />
                )}
                <Icon className="size-[21px] stroke-[1.65]" aria-hidden="true" />
                <SidebarTooltip label={item.label} />
              </Link>
            );
          })}

          {/* Configurações Icon (5th required icon) */}
          {isAdmin ? (
            <Link
              to="/admin"
              aria-label="Configurações"
              aria-current={isConfigActive ? "page" : undefined}
              className={cn(
                "group relative size-12 rounded-[18px] flex items-center justify-center transition-all duration-200 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00]",
                isConfigActive
                  ? "bg-[#FF6B00]/15 text-[#FF6B00] border-[#FF6B00]/40 shadow-[0_0_24px_rgba(255,107,0,0.38)]"
                  : "bg-transparent text-white/50 border-transparent hover:text-white/95 hover:bg-white/[0.05] hover:border-white/[0.08]",
              )}
            >
              {isConfigActive && (
                <span
                  aria-hidden="true"
                  className="absolute -left-3 w-1 h-5 rounded-r-full bg-[#FF6B00] shadow-[0_0_12px_#FF6B00]"
                />
              )}
              <Settings className="size-[21px] stroke-[1.65]" aria-hidden="true" />
              <SidebarTooltip label="Configurações" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setOperatorModalOpen(true)}
              aria-label="Configurações"
              className={cn(
                "group relative size-12 rounded-[18px] flex items-center justify-center transition-all duration-200 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00]",
                operatorModalOpen
                  ? "bg-[#FF6B00]/15 text-[#FF6B00] border-[#FF6B00]/40 shadow-[0_0_24px_rgba(255,107,0,0.38)]"
                  : "bg-transparent text-white/50 border-transparent hover:text-white/95 hover:bg-white/[0.05] hover:border-white/[0.08]",
              )}
            >
              <Settings className="size-[21px] stroke-[1.65]" aria-hidden="true" />
              <SidebarTooltip label="Configurações" />
            </button>
          )}
        </nav>

        {/* Bottom Utility Icon Controls (Icon-only) */}
        <div className="flex flex-col items-center gap-2.5">
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Encerrar sessão"
            className="group relative size-11 rounded-[16px] flex items-center justify-center text-white/45 hover:text-[#FF6B00] hover:bg-white/[0.05] border border-transparent hover:border-white/[0.08] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00]"
          >
            <LogOut className="size-[19px] stroke-[1.65]" aria-hidden="true" />
            <SidebarTooltip label="Sair" />
          </button>
        </div>
      </aside>

      {/* Main Glass Container */}
      <main className="flex-1 min-w-0 glass-shell relative z-10 flex flex-col overflow-hidden pb-24 md:pb-0">
        {/* Mobile Header Strip */}
        <div className="md:hidden flex items-center justify-between px-4 py-3.5 border-b border-white/[0.06]">
          <Link to="/" className="flex items-center gap-2.5 min-w-0">
            {logoUrl ? (
              <img src={logoUrl} alt={systemName} className="size-8 rounded-xl object-cover" />
            ) : (
              <div className="size-8 rounded-xl bg-[#FF6B00]/15 border border-[#FF6B00]/35 flex items-center justify-center text-[#FF6B00]">
                <Sparkles className="size-4 stroke-[1.75]" aria-hidden="true" />
              </div>
            )}
            <span className="font-display font-semibold text-sm text-white/95 truncate">
              {systemName}
            </span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Sair"
            className="size-10 rounded-xl flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.06]"
          >
            <LogOut className="size-[18px] stroke-[1.65]" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 min-w-0">{children}</div>
      </main>

      {/* Mobile Floating Bottom Icon Dock */}
      <nav
        aria-label="Menu rápido mobile"
        className="md:hidden fixed bottom-4 left-4 right-4 z-40 h-16 rounded-[24px] px-3 flex items-center justify-around"
        style={{
          background: "rgba(18, 18, 22, 0.84)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.4)",
        }}
      >
        {primaryNavItems.map((item) => {
          const active = isItemActive(item.to, item.exact);
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              to={item.to}
              aria-label={item.label}
              className={cn(
                "size-11 rounded-[16px] flex items-center justify-center transition-all",
                active
                  ? "bg-[#FF6B00]/15 text-[#FF6B00] border border-[#FF6B00]/40 shadow-[0_0_20px_rgba(255,107,0,0.35)]"
                  : "text-white/55 hover:text-white",
              )}
            >
              <Icon className="size-5 stroke-[1.65]" aria-hidden="true" />
            </Link>
          );
        })}
        {isAdmin ? (
          <Link
            to="/admin"
            aria-label="Configurações"
            className={cn(
              "size-11 rounded-[16px] flex items-center justify-center transition-all",
              isConfigActive
                ? "bg-[#FF6B00]/15 text-[#FF6B00] border border-[#FF6B00]/40 shadow-[0_0_20px_rgba(255,107,0,0.35)]"
                : "text-white/55 hover:text-white",
            )}
          >
            <Settings className="size-5 stroke-[1.65]" aria-hidden="true" />
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setOperatorModalOpen(true)}
            aria-label="Configurações"
            className="size-11 rounded-[16px] flex items-center justify-center text-white/55 hover:text-white"
          >
            <Settings className="size-5 stroke-[1.65]" aria-hidden="true" />
          </button>
        )}
      </nav>

      {/* Operator Preferences Dialog (for non-admin accounts) */}
      <Dialog open={operatorModalOpen} onOpenChange={setOperatorModalOpen}>
        <DialogContent className="glass-card-elevated border-white/[0.1] bg-[#18181b]/90 text-white max-w-md rounded-[24px]">
          <DialogHeader>
            <DialogTitle className="font-display text-lg flex items-center gap-2">
              <Settings className="size-4 text-[#FF6B00]" aria-hidden="true" />
              Preferências da Portaria
            </DialogTitle>
            <DialogDescription className="text-white/55">
              Ajustes locais da sua estação de check-in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-white/90 truncate">{user.email}</div>
                <div className="text-xs text-white/50 flex items-center gap-1.5 mt-0.5">
                  <Shield className="size-3 text-[#FF6B00]" aria-hidden="true" />
                  Perfil Operador de Portaria
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleStrictMode}
              className="w-full rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] p-4 flex items-center justify-between text-left transition-colors"
            >
              <div>
                <div className="text-sm font-medium text-white/90">Modo Estrito de Entrada</div>
                <div className="text-xs text-white/50 mt-0.5">
                  Bloqueia check-in acima da quantidade de ingressos
                </div>
              </div>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
                  strictMode
                    ? "bg-[#FF6B00]/15 text-[#FF6B00] border border-[#FF6B00]/30"
                    : "bg-white/[0.06] text-white/60 border border-white/[0.08]",
                )}
              >
                {strictMode ? (
                  <>
                    <Lock className="size-3" aria-hidden="true" /> Ativo
                  </>
                ) : (
                  <>
                    <Unlock className="size-3" aria-hidden="true" /> Flexível
                  </>
                )}
              </span>
            </button>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={handleLogout}
                className="text-white/70 hover:text-white hover:bg-white/[0.06]"
              >
                <LogOut className="size-4" aria-hidden="true" />
                Sair da conta
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SidebarTooltip({ label }: { label: string }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute left-[calc(100%+14px)] top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl text-xs font-medium text-white/95 whitespace-nowrap opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100 group-focus-visible:translate-x-0 transition-all duration-150 z-50"
      style={{
        background: "rgba(24, 24, 28, 0.92)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.45)",
      }}
    >
      {label}
    </span>
  );
}
