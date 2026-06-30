import { useState, useEffect } from "react";
import { getPublicMenuUrl } from "@/lib/menus.functions";
import { Logo } from "@/components/Logo";

export default function MenuViewer() {
  const id = window.location.pathname.split("/").pop() || "";
  const [data, setData] = useState<{ url: string; filename: string } | null>(null);

  useEffect(() => {
    getPublicMenuUrl({ data: { id } }).then(setData).catch(() => setData(null));
  }, [id]);

  if (!data) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="size-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/60">
        <Logo size={36} />
        <div>
          <div className="font-display gold-text leading-tight">Esquites La Parroquia</div>
          <div className="text-xs text-muted-foreground truncate">{data.filename ?? "Menú"}</div>
        </div>
      </header>
      <iframe
        src={data.url ?? ""}
        title="Menú PDF"
        className="flex-1 w-full border-0 bg-white"
      />
    </div>
  );
}
