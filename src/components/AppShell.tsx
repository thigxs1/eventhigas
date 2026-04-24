import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Calendar, LayoutDashboard, ScanLine, Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/eventos", label: "Eventos", icon: Calendar, exact: false },
  { to: "/checkin", label: "Check-in", icon: ScanLine, exact: false },
  { to: "/convidados", label: "Convidados", icon: Users, exact: false },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { location } = useRouterState();

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="px-6 py-7 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="size-9 rounded-xl flex items-center justify-center bg-[image:var(--gradient-primary)] shadow-[var(--shadow-glow)] transition-transform group-hover:scale-105">
              <Sparkles className="size-5 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <div className="font-display font-bold text-base text-sidebar-foreground">
                Casa de Eventos
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
        </nav>

        <div className="px-5 py-4 border-t border-sidebar-border">
          <div className="text-[11px] text-muted-foreground">
            v1.0 · Operação local
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top nav */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-sidebar-border bg-sidebar">
          <Link to="/" className="flex items-center gap-2">
            <div className="size-8 rounded-lg flex items-center justify-center bg-[image:var(--gradient-primary)]">
              <Sparkles className="size-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold">Casa de Eventos</span>
          </Link>
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
        </div>

        <div className="flex-1 min-w-0">
          {children}
        </div>
      </main>
    </div>
  );
}
