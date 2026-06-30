import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import logoTicket from "@/assets/logo-ticket.png";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

// Route: C:\Users\oviey\esquites\src\routes\corte.$id.tsx — converted to SPA
interface CorteData {
  id: string;
  openedAt: string;
  closedAt: string | null;
  cashierName: string;
  openingAmount: number;
  openingBreakdown: Record<string, number> | null;
  closingBreakdown: Record<string, number> | null;
  salesCash: number;
  salesCard: number;
  salesTransfer: number;
  salesCount: number;
  expectedAmount: number;
  realAmount: number;
  difference: number;
  notes: string | null;
  topProducts: { name: string; quantity: number }[];
}

export default function CortePage() {
  const { id } = Route.useParams();
  const goTo = (path) => { window.location.href = path; };
const [data, setData] = useState<CorteData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      // 1. Get register
      const { data: reg, error: regErr } = await supabase
        .from("cash_register")
        .select("*")
        .eq("id", id)
        .single();

      if (regErr || !reg) throw new Error("Corte no encontrado.");

      // 2. Get cashier name
      let cashierName = "Cajero";
      if (reg.user_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", reg.user_id)
          .maybeSingle();
        cashierName = profile?.full_name ?? "Cajero";
      }

      // 3. Get sales
      const { data: sales } = await supabase
        .from("sales")
        .select("id, total, created_at, payment_method")
        .eq("cash_register_id", id)
        .is("cancelled", false);

      const activeSales = (sales ?? []).filter((s: any) => s.status !== "cancelada");

      let salesCash = 0, salesCard = 0, salesTransfer = 0;
      for (const s of activeSales) {
        const method = s.payment_method ?? "efectivo";
        const total = Number(s.total ?? 0);
        if (method === "efectivo") salesCash += total;
        else if (method === "tarjeta") salesCard += total;
        else if (method === "transferencia") salesTransfer += total;
        else salesCash += total;
      }

      // 4. Top products (simplified: just count from sale_items)
      let topProducts: { name: string; quantity: number }[] = [];
      if (activeSales.length > 0) {
        const saleIds = activeSales.map((s: any) => s.id);
        const { data: items } = await supabase
          .from("sale_items")
          .select("product_name, quantity")
          .in("sale_id", saleIds);

        const productMap: Record<string, number> = {};
        for (const item of items ?? []) {
          const name = item.product_name ?? "Producto";
          productMap[name] = (productMap[name] || 0) + (item.quantity ?? 0);
        }
        topProducts = Object.entries(productMap)
          .map(([name, quantity]) => ({ name, quantity }))
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 10);
      }

      // 5. Parse breakdowns
      let openingBreakdown: Record<string, number> | null = null;
      let closingBreakdown: Record<string, number> | null = null;
      try { if (reg.opening_breakdown) openingBreakdown = reg.opening_breakdown as any; } catch {}
      try { if (reg.closing_breakdown) closingBreakdown = reg.closing_breakdown as any; } catch {}

      const openingAmount = Number(reg.opening_amount ?? 0);
      const expectedAmount = openingAmount + salesCash;
      const realAmount = Number(reg.closing_amount ?? expectedAmount);
      const difference = realAmount - expectedAmount;

      setData({
        id: reg.id,
        openedAt: reg.opened_at,
        closedAt: reg.closed_at,
        cashierName,
        openingAmount,
        openingBreakdown,
        closingBreakdown,
        salesCash,
        salesCard,
        salesTransfer,
        salesCount: activeSales.length,
        expectedAmount,
        realAmount,
        difference,
        notes: reg.notes ?? null,
        topProducts,
      });
    }

    load()
      .then(() => {})
      .catch((e: any) => setError(e.message));
  }, [id]);

  // Auto-scroll to top when data loads
  useEffect(() => {
    if (data) window.scrollTo(0, 0);
  }, [data]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-6 font-sans">
        <div className="text-center">
          <p className="text-red-600 mb-2">{error}</p>
          <button onClick={() => goTo("/caja")} className="text-sm text-blue-600 underline">Cerrar</button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="size-8 animate-spin text-amber-600" />
      </div>
    );
  }

  const totalSales = data.salesCash + data.salesCard + data.salesTransfer;
  const diff = data.difference;

  return (
    <div className="min-h-screen bg-gray-100 flex items-start justify-center p-4 print:bg-white print:p-0">
      <div className="corte-wrapper">
        <div className="no-print flex gap-2 mb-3 justify-center">
          <button onClick={() => window.print()} className="px-8 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-lg transition text-lg animate-pulse">
            🖨️  IMPRIMIR CORTE
          </button>
          <button onClick={() => goTo("/caja")} className="px-5 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-medium transition">
            Volver a caja
          </button>
        </div>

        <div className="corte bg-white shadow-xl print:shadow-none">
          <div className="corte-header">
            <img src={logoTicket} alt="Logo" className="corte-logo" />
            <h1 className="corte-title">Esquites La Parroquia</h1>
            <p className="corte-subtitle">¡El sabor que nos une!</p>
            <p className="corte-address">Acámbaro, Gto.</p>
          </div>

          <div className="corte-divider" />
          <h2 className="corte-section-title">CORTE DE CAJA</h2>
          <div className="corte-divider" />

          <div className="corte-row"><span>Folio:</span><span className="font-bold">{data.id.slice(0, 8).toUpperCase()}</span></div>
          <div className="corte-row"><span>Cajero:</span><span>{data.cashierName}</span></div>
          <div className="corte-row"><span>Apertura:</span><span>{format(new Date(data.openedAt), "dd/MM/yyyy HH:mm", { locale: es })}</span></div>
          <div className="corte-row"><span>Cierre:</span><span>{data.closedAt ? format(new Date(data.closedAt), "dd/MM/yyyy HH:mm", { locale: es }) : "—"}</span></div>

          <div className="corte-divider" />
          <h3 className="corte-label">VENTAS</h3>
          <div className="corte-row"><span>Efectivo</span><span>{fmt(data.salesCash)}</span></div>
          <div className="corte-row"><span>Tarjeta</span><span>{fmt(data.salesCard)}</span></div>
          <div className="corte-row"><span>Transferencia</span><span>{fmt(data.salesTransfer)}</span></div>
          <div className="corte-row font-bold"><span>Total ventas</span><span>{fmt(totalSales)}</span></div>
          <div className="corte-row"><span>Tickets</span><span>{data.salesCount}</span></div>

          {data.topProducts.length > 0 && (
            <>
              <div className="corte-divider" />
              <h3 className="corte-label">MÁS VENDIDOS</h3>
              {data.topProducts.map((p, i) => (
                <div key={i} className="corte-row text-sm"><span>{i + 1}. {p.name}</span><span>{p.quantity}u</span></div>
              ))}
            </>
          )}

          <div className="corte-divider" />
          <h3 className="corte-label">ARQUEO</h3>
          <div className="corte-row"><span>Fondo inicial</span><span>{fmt(data.openingAmount)}</span></div>
          <div className="corte-row"><span>Efectivo esperado</span><span>{fmt(data.expectedAmount)}</span></div>
          <div className="corte-row font-bold"><span>Efectivo real</span><span>{fmt(data.realAmount)}</span></div>
          <div className={`corte-row font-bold ${diff === 0 ? "" : diff > 0 ? "text-emerald-600" : "text-red-600"}`}>
            <span>Diferencia</span><span>{diff >= 0 ? "+" : ""}{fmt(diff)}</span>
          </div>

          {data.closingBreakdown && Object.keys(data.closingBreakdown).length > 0 && (
            <>
              <div className="corte-divider" />
              <h3 className="corte-label">DESGLOSE</h3>
              {Object.entries(data.closingBreakdown)
                .filter(([, qty]) => qty > 0)
                .sort(([a], [b]) => parseFloat(b) - parseFloat(a))
                .map(([den, qty]) => (
                  <div key={den} className="corte-row text-sm">
                    <span>${parseFloat(den).toFixed(den.includes(".") ? 2 : 0)}</span>
                    <span>{qty}u = {fmt(parseFloat(den) * qty)}</span>
                  </div>
                ))}
            </>
          )}

          {data.notes && (
            <>
              <div className="corte-divider" />
              <h3 className="corte-label">NOTAS</h3>
              <p className="text-xs italic">{data.notes}</p>
            </>
          )}

          <div className="corte-divider" />
          <div className="corte-footer">
            <p className="italic">Comprobante de corte de caja</p>
            <p className="opacity-60 mt-1">{format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}</p>
          </div>
          <div className="corte-feed" />
        </div>
      </div>
    </div>
  );
}
