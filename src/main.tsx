import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "sonner";
import "./styles.css";

// Lazy-load route pages
const LandingPage = lazy(() => import("./routes/index"));
const AuthPage = lazy(() => import("./routes/auth"));
const AuthGuard = lazy(() => import("./routes/_authenticated/route"));

// Authenticated pages (lazy-loaded within AuthGuard)
const POSPage = lazy(() => import("./routes/_authenticated/pos"));
const DashboardPage = lazy(() => import("./routes/_authenticated/dashboard"));
const CajaPage = lazy(() => import("./routes/_authenticated/caja"));
const CocinaPage = lazy(() => import("./routes/_authenticated/cocina"));
const HistorialPage = lazy(() => import("./routes/_authenticated/historial"));
const InventarioPage = lazy(() => import("./routes/_authenticated/inventario"));
const ProductosPage = lazy(() => import("./routes/_authenticated/productos"));
const ClientesPage = lazy(() => import("./routes/_authenticated/clientes"));
const ConfigPage = lazy(() => import("./routes/_authenticated/configuracion"));
const MenuPage = lazy(() => import("./routes/_authenticated/menu"));
const GastosPage = lazy(() => import("./routes/_authenticated/gastos"));
const TicketPage = lazy(() => import("./routes/ticket.$id"));
const CortePage = lazy(() => import("./routes/corte.$id"));
const MenuViewerPage = lazy(() => import("./routes/m.$id"));

function AuthWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div style={{display:"flex",minHeight:"100vh",alignItems:"center",justifyContent:"center",background:"#0a0a0a",color:"white"}}>
        <div className="size-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AuthGuard>{children}</AuthGuard>
    </Suspense>
  );
}

function LoadingFallback() {
  return (
    <div style={{display:"flex",minHeight:"100vh",alignItems:"center",justifyContent:"center",background:"#0a0a0a",color:"white"}}>
      <p>Cargando...</p>
    </div>
  );
}

function SimpleRouter() {
  const path = window.location.pathname;

  // Authenticated routes map
  const authPages: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {
    "/pos": POSPage,
    "/dashboard": DashboardPage,
    "/caja": CajaPage,
    "/cocina": CocinaPage,
    "/historial": HistorialPage,
    "/inventario": InventarioPage,
    "/productos": ProductosPage,
    "/clientes": ClientesPage,
    "/configuracion": ConfigPage,
    "/menu": MenuPage,
    "/gastos": GastosPage,
  };

  // Auth pages (wrapped in AuthGuard)
  if (authPages[path]) {
    const Page = authPages[path];
    return <AuthWrapper><Page /></AuthWrapper>;
  }

  // Dynamic authenticated routes
  if (path.startsWith("/ticket/")) return <AuthWrapper><TicketPage /></AuthWrapper>;
  if (path.startsWith("/corte/")) return <AuthWrapper><CortePage /></AuthWrapper>;

  // Public routes
  if (path === "/" || path === "") return <Suspense fallback={<LoadingFallback />}><LandingPage /></Suspense>;
  if (path === "/auth") return <Suspense fallback={<LoadingFallback />}><AuthPage /></Suspense>;

  // Public dynamic
  if (path.startsWith("/m/")) return <Suspense fallback={<LoadingFallback />}><MenuViewerPage /></Suspense>;

  // 404
  return (
    <div style={{display:"flex",minHeight:"100vh",alignItems:"center",justifyContent:"center",background:"#0a0a0a",color:"white"}}>
      <div style={{textAlign:"center"}}>
        <h1 style={{fontSize:64,color:"#d4a853"}}>404</h1>
        <p>Página no encontrada</p>
        <a href="/" style={{color:"#d4a853",marginTop:16,display:"inline-block"}}>← Volver al inicio</a>
      </div>
    </div>
  );
}

const queryClient = new QueryClient();
const rootElement = document.getElementById("root")!;
if (!rootElement.hasChildNodes()) {
  createRoot(rootElement).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <SimpleRouter />
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
}
