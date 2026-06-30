import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import appCss from "../styles.css?url";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "sonner";
import { Button } from "@/components/ui/button";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
  pendingComponent: () => (
    <div style={{display:"flex",minHeight:"100vh",alignItems:"center",justifyContent:"center",background:"#0a0a0a",color:"white"}}>
      <div style={{textAlign:"center"}}>
        <div style={{width:48,height:48,border:"4px solid #d4a853",borderTop:"transparent",borderRadius:"50%",animation:"spin 1s linear infinite",margin:"0 auto"}} />
        <p style={{marginTop:16,opacity:0.7}}>Cargando...</p>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div style={{padding:40,color:"white",background:"#0a0a0a",minHeight:"100vh",fontFamily:"monospace"}}>
      <h1 style={{color:"#d4a853"}}>Error de Aplicación</h1>
      <pre style={{background:"#1a1a1a",padding:20,borderRadius:8,marginTop:16,whiteSpace:"pre-wrap"}}>{error.message}{"\n"}{error.stack}</pre>
      <Button onClick={() => window.location.reload()} style={{marginTop:16}}>Reintentar</Button>
    </div>
  ),
  notFoundComponent: () => (
    <div style={{display:"flex",minHeight:"100vh",alignItems:"center",justifyContent:"center",background:"#0a0a0a",color:"white"}}>
      <div style={{textAlign:"center"}}>
        <h1 style={{fontSize:64,color:"#d4a853"}}>404</h1>
        <p>Página no encontrada</p>
      </div>
    </div>
  ),
});

export default function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <div style={{minHeight:"100vh",background:"#0a0a0a",color:"white"}}>
          <main>
            <Outlet />
            <Toaster position="top-right" richColors />
          </main>
        </div>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
