import { QueryClient, QueryClientProvider, useSuspenseQuery } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, useMemo, type ReactNode } from "react";
import { Wrench } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { SearchBox } from "@/components/SearchBox";
import { catalogQuery, categories, setCatalog } from "@/lib/products";
import { storeConfigQuery } from "@/lib/settings";
import { attachCartToUser } from "@/lib/cart";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { PageSkeleton } from "@/components/Skeletons";
import { StoreAppearance } from "@/components/StoreAppearance";
import { SiteHeader } from "@/components/SiteHeader";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg text-center">
        <p className="font-display text-8xl font-extrabold text-primary">404</p>
        <h1 className="mt-4 font-display text-2xl font-bold">We couldn't find that page</h1>
        <p className="mt-2 text-sm text-muted-foreground">Try a search, or jump into a category.</p>
        <div className="mx-auto mt-6 max-w-sm text-left">
          <SearchBox />
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {categories.map((c) => (
            <Link key={c.slug} to="/c/$slug" params={{ slug: c.slug }} className="rounded-full border border-border px-4 py-1.5 text-sm font-medium hover:border-primary">
              {c.name}
            </Link>
          ))}
        </div>
        <Link to="/" className="mt-8 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">
          Go home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  const ref = useMemo(() => `ERR-${Date.now().toString(36).toUpperCase()}`, []);
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component", reference: ref });
  }, [error, ref]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-2xl font-bold">Something went wrong on our side</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Please try again. If it keeps happening, contact support@correctbuy.store and quote reference{" "}
          <span className="font-mono font-semibold text-foreground">{ref}</span>.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Try again
          </button>
          <a href="/" className="inline-flex items-center justify-center rounded-full border border-input px-5 py-2.5 text-sm font-semibold">
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  loader: async ({ context }) => {
    await Promise.all([context.queryClient.ensureQueryData(catalogQuery), context.queryClient.ensureQueryData(storeConfigQuery)]);
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "CorrectBuy" },
      { name: "description", content: "CorrectBuy — buy right, the first time." },
      { property: "og:title", content: "CorrectBuy" },
      { property: "og:description", content: "CorrectBuy — buy right, the first time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800;900&family=Bricolage+Grotesque:opsz,wght@12..96,500..700&family=Hind:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
  pendingComponent: PageSkeleton,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function CatalogProvider({ children }: { children: ReactNode }) {
  const { data } = useSuspenseQuery(catalogQuery);
  setCatalog(data); // idempotent: publishes the catalog to synchronous helpers before children render
  return <>{children}</>;
}

function MaintenanceGate({ children }: { children: ReactNode }) {
  const { data } = useSuspenseQuery(storeConfigQuery);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { isStaff } = useAuth();
  const exempt = path.startsWith("/admin") || path.startsWith("/api") || path === "/login";
  if (data.settings.maintenance_mode && !exempt && !isStaff) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <Wrench className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-4 font-display text-3xl font-extrabold">Back soon</h1>
          <p className="mt-3 text-muted-foreground">{data.settings.maintenance_message}</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

function AuthBridge() {
  const router = useRouter();
  const { queryClient } = Route.useRouteContext();
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => attachCartToUser(data.user?.id ?? null));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      void attachCartToUser(session?.user?.id ?? null);
      router.invalidate();
      if (event !== "SIGNED_OUT") void queryClient.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [router, queryClient]);
  return null;
}

/** Pages that run without the storefront header (admin, auth screens, payment hand-off). */
const NO_HEADER = /^\/(admin|login|register|forgot-password|reset-password|checkout\/(pay|callback))(\/|$)/;

/**
 * The storefront header lives here, above the Outlet, so it is mounted once and stays put
 * (no re-animation, no flicker) while pages switch underneath it.
 */
function PersistentHeader() {
  const pathname = useRouterState({ select: (st) => st.location.pathname });
  return NO_HEADER.test(pathname) ? null : <SiteHeader />;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <CatalogProvider>
        <StoreAppearance>
        <MaintenanceGate>
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <PersistentHeader />
          <Outlet />
        </MaintenanceGate>
        <WhatsAppButton />
        </StoreAppearance>
      </CatalogProvider>
      <AuthBridge />
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}
