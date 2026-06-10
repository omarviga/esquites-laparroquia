import { create } from "zustand";
import type { CartItem } from "./cart";

export type PaymentMethod = "efectivo" | "tarjeta" | "transferencia" | "mixto";

export type Sale = {
  id: string;
  folio: string;
  createdAt: string;
  cashier: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  payment: PaymentMethod;
  received?: number;
  change?: number;
  cancelled?: boolean;
};

type SalesState = {
  sales: Sale[];
  addSale: (s: Sale) => void;
  cancel: (id: string) => void;
};

let folioCounter = 1001;
export const nextFolio = () => `LP-${(folioCounter++).toString().padStart(5, "0")}`;

export const useSales = create<SalesState>((set) => ({
  sales: [],
  addSale: (s) => set((st) => ({ sales: [s, ...st.sales] })),
  cancel: (id) => set((st) => ({ sales: st.sales.map((s) => (s.id === id ? { ...s, cancelled: true } : s)) })),
}));
