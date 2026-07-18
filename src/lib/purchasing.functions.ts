import { localApi } from "./api/api-client";

export interface Supplier {
  id: string;
  name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  created_at?: string;
}

export interface PurchaseOrder {
  id: string;
  supplier_id?: string;
  folio?: string;
  status: string;
  notes?: string;
  total: number;
  created_at: string;
  received_at?: string;
  supplier_name?: string;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  inventory_item_id: string;
  quantity: number;
  unit_cost: number;
  subtotal: number;
  item_name?: string;
  unit?: string;
}

export interface SuggestResult {
  suggestions: {
    inventory_item_id: string;
    item_name: string;
    unit: string;
    current_stock: number;
    min_stock: number;
    suggested_qty: number;
    unit_cost: number;
    reason: string;
  }[];
  generated_at: string;
  days_analyzed: number;
}

export const purchasingApi = {
  // Suppliers
  getSuppliers() {
    return localApi.get<Supplier[]>("/api/suppliers");
  },
  upsertSupplier(data: Partial<Supplier>) {
    if (data.id) {
      return localApi.put(`/api/suppliers/${data.id}`, data);
    }
    return localApi.post("/api/suppliers", data);
  },
  deleteSupplier(id: string) {
    return localApi.delete(`/api/suppliers/${id}`);
  },

  // Purchase orders
  getPurchaseOrders() {
    return localApi.get<PurchaseOrder[]>("/api/purchase_orders");
  },
  getPurchaseOrder(id: string) {
    return localApi.get<PurchaseOrder>(`/api/purchase_orders/${id}`);
  },
  upsertPurchaseOrder(data: Partial<PurchaseOrder>) {
    if (data.id) {
      return localApi.put(`/api/purchase_orders/${data.id}`, data);
    }
    return localApi.post("/api/purchase_orders", data);
  },
  deletePurchaseOrder(id: string) {
    return localApi.delete(`/api/purchase_orders/${id}`);
  },

  // Purchase order items
  getItems(poId: string) {
    return localApi.get<PurchaseOrderItem[]>(`/api/purchase_order_items?purchase_order_id=${poId}`);
  },
  upsertItem(data: Partial<PurchaseOrderItem>) {
    if (data.id) {
      return localApi.put(`/api/purchase_order_items/${data.id}`, data);
    }
    return localApi.post("/api/purchase_order_items", data);
  },
  deleteItem(id: string) {
    return localApi.delete(`/api/purchase_order_items/${id}`);
  },

  // Custom endpoints
  suggest(daysBack = 7) {
    return localApi.post<SuggestResult>("/api/purchase-orders/suggest", { daysBack });
  },
  receive(id: string) {
    return localApi.post<{ ok: boolean; items_processed: number }>(`/api/purchase-orders/${id}/receive`);
  },
};
