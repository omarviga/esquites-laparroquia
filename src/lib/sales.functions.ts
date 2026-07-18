// src/lib/sales.functions.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { localApi } from "./api/api-client";
import { inventoryApi } from "./inventory.functions";

// ─── Types ──────────────────────────────────────────────────

export interface SaleData {
  folio: string;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  cashReceived?: number;
  changeAmount?: number;
  customerId?: string;
  discount?: number;
  discountReason?: string;
  isCourtesy?: boolean;
  kitchenNotes?: string;
  items: any[];
}

// ─── Server Functions ──────────────────────────────────────

const saveSaleInput = z.object({
  folio: z.string(),
  subtotal: z.number(),
  tax: z.number(),
  total: z.number(),
  paymentMethod: z.string(),
  cashReceived: z.number().optional(),
  changeAmount: z.number().optional(),
  customerId: z.string().optional(),
  discount: z.number().optional(),
  discountReason: z.string().optional(),
  isCourtesy: z.boolean().optional(),
  kitchenNotes: z.string().max(300).optional(),
  items: z.array(z.object({
    productId: z.string(),
    productName: z.string(),
    quantity: z.number(),
    unitPrice: z.number(),
    modifiers: z.array(z.object({
      modifierId: z.string().optional().nullable(),
      modifierName: z.string(),
      extraPrice: z.number()
    }))
  }))
});

export const saveSale = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => saveSaleInput.parse(d))
  .handler(async ({ data }) => {
    const sale = await localApi.post('/api/sales', {
      folio: data.folio,
      subtotal: data.subtotal,
      tax: data.tax,
      total: data.total,
      payment_method: data.paymentMethod,
      cash_received: data.cashReceived || 0,
      change_amount: data.changeAmount || 0,
      customer_id: data.customerId || null,
      discount: data.discount || 0,
      discount_reason: data.discountReason || null,
      is_courtesy: data.isCourtesy || false,
      kitchen_notes: data.kitchenNotes || null,
      kds_status: 'pendiente',
      status: 'completada',
      cancelled: 0,
      created_at: new Date().toISOString(),
    });

    for (const item of data.items) {
      await localApi.post('/api/sale_items', {
        sale_id: sale.id,
        product_id: item.productId,
        product_name: item.productName,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total: item.quantity * item.unitPrice,
        kds_item_status: 'pendiente',
      });
    }

    // Descontar inventario según las recetas de cada producto
    try {
      await inventoryApi.deductFromSale(
        data.items.map(i => ({
          productId: i.productId,
          productName: i.productName,
          quantity: i.quantity,
          saleId: sale.id,
          folio: data.folio,
        }))
      );
    } catch (e: any) {
      console.warn('⚠ No se pudo descontar inventario:', e.message);
    }

    return { saleId: sale.id, autoPrint: true };
  });

const updateKdsInput = z.object({ 
  saleId: z.string(), 
  status: z.string() 
});

export const updateKdsStatus = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => updateKdsInput.parse(d))
  .handler(async ({ data }) => {
    return localApi.put(`/api/sales/${data.saleId}`, { kds_status: data.status });
  });

const updateSaleItemKdsInput = z.object({
  itemId: z.string(),
  status: z.enum(["pendiente", "listo"]),
});

export const updateSaleItemKdsStatus = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => updateSaleItemKdsInput.parse(d))
  .handler(async ({ data }) => {
    return localApi.put(`/api/sale_items/${data.itemId}`, { kds_item_status: data.status });
  });

const getSaleInput = z.object({ saleId: z.string() });

export const getSaleForTicket = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => getSaleInput.parse(d))
  .handler(async ({ data }) => {
    const sale: any = await localApi.get(`/api/sales/${data.saleId}`);
    const items: any[] = await localApi.get(`/api/sale_items?sale_id=${sale.id}`);
    return {
      folio: sale.folio,
      createdAt: sale.created_at,
      cashier: sale.cashier || sale.user_id || '',
      subtotal: sale.subtotal || 0,
      tax: sale.tax || 0,
      total: sale.total || 0,
      paymentMethod: sale.payment_method || 'efectivo',
      cashReceived: sale.cash_received,
      changeAmount: sale.change_amount,
      discount: sale.discount,
      discountReason: sale.discount_reason,
      isCourtesy: Boolean(sale.is_courtesy),
      kitchenNotes: sale.kitchen_notes,
      items: items.map((i: any) => ({
        name: i.product_name,
        quantity: i.quantity,
        unitPrice: i.unit_price,
        modifiers: i.modifiers ? (typeof i.modifiers === 'string' ? JSON.parse(i.modifiers) : i.modifiers) : [],
      })),
      businessName: 'Esquites La Parroquia',
      slogan: '¡El sabor que nos une!',
      address: 'Acámbaro, Gto.',
      phone: '',
      footerMessage: '¡Gracias por su compra!',
    };
  });