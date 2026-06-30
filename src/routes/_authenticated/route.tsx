import { useState, useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/Sidebar";
import { OfflineSync } from "@/components/OfflineSync";
import { Toaster } from "sonner";

export default function AuthGuard({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      if (!user) {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          setLoading(false);
          return;
        }
        window.location.href = "/auth";
        return;
      }
      setAuthenticated(true);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="size-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!authenticated) return null;

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 min-w-0">
        {children}
        <OfflineSync />
      </main>
    </div>
  );
}
