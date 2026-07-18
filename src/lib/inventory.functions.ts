// src/lib/inventory.functions.ts
import { localApi } from "./api/api-client";

export interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  stock: number;
  min_stock: number;
  cost_per_unit: number;
  created_at?: string;
}

export interface ProductRecipe {
  id?: string;
  product_id: string;
  inventory_item_id: string;
  quantity: number;
}

export interface StockMovement {
  id: string;
  inventory_item_id: string;
  type: string;
  quantity: number;
  stock_before: number;
  stock_after: number;
  reference_type?: string;
  reference_id?: string;
  notes?: string;
  created_at: string;
  item_name?: string;
}

export interface RecipeEnriched {
  id: string;
  product_id: string;
  inventory_item_id: string;
  quantity: number;
  item_name: string;
  unit: string;
  current_stock: number;
}

export const inventoryApi = {
  getItems() {
    return localApi.get<InventoryItem[]>("/api/inventory_items");
  },

  upsertItem(data: Partial<InventoryItem>) {
    if (data.id) {
      return localApi.put(`/api/inventory_items/${data.id}`, data);
    }
    return localApi.post("/api/inventory_items", data);
  },

  deleteItem(id: string) {
    return localApi.delete(`/api/inventory_items/${id}`);
  },

  getRecipes(productId: string) {
    return localApi.get<ProductRecipe[]>(
      `/api/product_recipes?product_id=${productId}`
    );
  },

  getRecipesEnriched(productId: string) {
    return localApi.get<RecipeEnriched[]>(
      `/api/inventory/recipes-enriched/${productId}`
    );
  },

  saveRecipe(data: ProductRecipe) {
    if (data.id) {
      return localApi.put(`/api/product_recipes/${data.id}`, data);
    }
    return localApi.post("/api/product_recipes", data);
  },

  deleteRecipe(id: string) {
    return localApi.delete(`/api/product_recipes/${id}`);
  },

  adjustStock(
    inventory_item_id: string,
    type: string,
    quantity: number,
    notes?: string
  ) {
    return localApi.post("/api/inventory/adjust", {
      inventory_item_id,
      type,
      quantity,
      notes,
    });
  },

  deductFromSale(items: any[]) {
    return localApi.post("/api/inventory/deduct-sale", { items });
  },

  getMovements(itemId: string, limit = 50) {
    return localApi.get<StockMovement[]>(
      `/api/inventory/movements?item_id=${itemId}&limit=${limit}`
    );
  },

  getAllMovements(limit = 100) {
    return localApi.get<StockMovement[]>(
      `/api/inventory/movements?limit=${limit}`
    );
  },

  getLowStock() {
    return localApi.get<InventoryItem[]>("/api/inventory/low-stock");
  },

  getRecipesByItem(itemId: string) {
    return localApi.get<any[]>(
      `/api/inventory/recipes-by-item/${itemId}`
    );
  },

  getSummary() {
    return localApi.get<{
      items: InventoryItem[];
      lowCount: number;
      totalValue: number;
      totalItems: number;
    }>("/api/inventory/summary");
  },
};
