import React from "react";
import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/hooks/useAuth";
import { SystemSettingsProvider } from "@/hooks/useSystemSettings";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <Providers>
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center px-4">
          <div className="max-w-md text-center">
            <h1 className="text-7xl font-display font-bold text-foreground">404</h1>
            <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              O endereço que você acessou não existe.
            </p>
            <div className="mt-6">
              <Link
                to="/"
                className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Voltar ao início
              </Link>
            </div>
          </div>
        </div>
      </AppShell>
    </Providers>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Casa de Eventos — Controle de Presença" },
      { name: "description", content: "Sistema profissional para gestão de eventos, listas de convidados e check-in de presença." },
      { name: "author", content: "Casa de Eventos" },
      { property: "og:title", content: "Casa de Eventos — Controle de Presença" },
      { property: "og:description", content: "Sistema profissional para gestão de eventos, listas de convidados e check-in de presença." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Casa de Eventos — Controle de Presença" },
      { name: "twitter:description", content: "Sistema profissional para gestão de eventos, listas de convidados e check-in de presença." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/d0525517-734c-468f-bdb6-123d8a46dbbb/id-preview-17580c0f--b39e5f4a-5f94-4f7b-aaa7-5f37a93223e0.lovable.app-1777057471759.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/d0525517-734c-468f-bdb6-123d8a46dbbb/id-preview-17580c0f--b39e5f4a-5f94-4f7b-aaa7-5f37a93223e0.lovable.app-1777057471759.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SystemSettingsProvider>
      <AuthProvider>{children}</AuthProvider>
    </SystemSettingsProvider>
  );
}

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Toaster />
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <Providers>
      <AppShell>
        <Outlet />
      </AppShell>
    </Providers>
  );
}
