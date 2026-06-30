import { getAuthContext } from "./auth.helper";

export const chatWithAI = async (data: { messages: { role: string; content: string }[] }) => {
  const { supabase } = await getAuthContext();
  const { messages } = data;

  // Dynamic import so it doesn't block page load
  const { generateText } = await import("ai");
  const { google } = await import("@ai-sdk/google");
  const { z } = await import("zod");

  const result = await generateText({
    model: google("gemini-2.0-flash"),
    messages: messages as any,
    system: `Eres el asistente inteligente de "Esquites La Parroquia", una esquitería en Acámbaro, Gto.
Tu trabajo es ayudar al personal del punto de venta (POS) con consultas rápidas.

REGLAS:
- Responde SIEMPRE en español mexicano, con un tono amable y servicial.
- Sé BREVE. Máximo 2-3 oraciones por respuesta a menos que pidan detalles.
- Si te preguntan algo que no puedes responder con tus herramientas, di "No tengo esa información, pero puedo consultar el inventario o ayudarte con descuentos."
- NUNCA inventes datos de ventas, inventario o finanzas. Siempre usa las herramientas disponibles.`,
    tools: {
      consultarStock: {
        description: "Consulta el stock actual de un producto o insumo en el inventario.",
        parameters: z.object({
          nombre: z.string().describe("El nombre del producto (ej: 'esquite grande', 'vaso mediano', 'chile en polvo')"),
        }),
        execute: async ({ nombre }: { nombre: string }) => {
          const { data: products, error } = await supabase
            .from("products")
            .select("name, stock, unit")
            .or(`name.ilike.%${nombre}%,name.ilike.${nombre}%`)
            .limit(5);

          if (error || !products?.length) {
            return { encontrado: false, mensaje: `No encontré "${nombre}" en el inventario.` };
          }

          return {
            encontrado: true,
            productos: products.map((p: any) => ({
              nombre: p.name,
              stock: p.stock ?? 0,
              unidad: p.unit ?? "pza",
            })),
          };
        },
      },

      consultarVentasHoy: {
        description: "Consulta el total de ventas del día actual y cantidad de tickets.",
        parameters: z.object({}),
        execute: async () => {
          const hoy = new Date();
          const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString();
          const fin = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1).toISOString();

          const { data: sales, error } = await supabase
            .from("sales")
            .select("total, payment_method, cancelled")
            .gte("created_at", inicio)
            .lt("created_at", fin);

          if (error || !sales) {
            return { error: "No se pudieron consultar las ventas." };
          }

          const activas = sales.filter((s: any) => !s.cancelled && s.status !== "cancelada");
          const total = activas.reduce((sum: number, s: any) => sum + Number(s.total ?? 0), 0);

          return {
            tickets: activas.length,
            total: `$${total.toFixed(2)} MXN`,
            efectivo: activas.filter((s: any) => s.payment_method === "efectivo").length,
            tarjeta: activas.filter((s: any) => s.payment_method === "tarjeta").length,
            transferencia: activas.filter((s: any) => s.payment_method === "transferencia").length,
          };
        },
      },

      productosMasVendidos: {
        description: "Lista los productos más vendidos del día.",
        parameters: z.object({}),
        execute: async () => {
          const hoy = new Date();
          const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString();
          const fin = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1).toISOString();

          const { data: sales } = await supabase
            .from("sales")
            .select("id")
            .gte("created_at", inicio)
            .lt("created_at", fin)
            .is("cancelled", false);

          if (!sales?.length) return { productos: [], mensaje: "No hay ventas hoy todavía." };

          const saleIds = sales.map((s: any) => s.id);
          const { data: items } = await supabase
            .from("sale_items")
            .select("product_name, quantity")
            .in("sale_id", saleIds);

          const conteo: Record<string, number> = {};
          for (const item of items ?? []) {
            const name = item.product_name ?? "Producto";
            conteo[name] = (conteo[name] || 0) + (item.quantity ?? 0);
          }

          const top = Object.entries(conteo)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([nombre, cantidad]) => ({ nombre, cantidad }));

          return { productos: top };
        },
      },

      aplicarDescuento: {
        description: "Calcula un descuento sobre un monto dado. NO aplica el descuento realmente, solo calcula.",
        parameters: z.object({
          monto: z.number().describe("El monto total de la venta actual"),
          porcentaje: z.number().min(1).max(100).describe("Porcentaje de descuento a aplicar (1-100)"),
        }),
        execute: async ({ monto, porcentaje }: { monto: number; porcentaje: number }) => {
          const descuento = monto * (porcentaje / 100);
          const total = monto - descuento;
          return {
            montoOriginal: `$${monto.toFixed(2)}`,
            descuento: `${porcentaje}% = $${descuento.toFixed(2)}`,
            totalConDescuento: `$${total.toFixed(2)}`,
          };
        },
      },
    },
  });

  return { text: result.text };
};
