import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { inventoryApi, type InventoryItem } from "@/lib/inventory.functions";
import { listProducts } from "@/lib/products.functions";
import { RecipeDialog } from "@/components/RecipeDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Box,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  RefreshCcw,
  History,
  Package,
  Eye,
  CookingPot,
  Search,
  Truck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { fmt } from "@/store/cart";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/inventario")({
  head: () => ({ meta: [{ title: "Inventario · Esquites La Parroquia" }] }),
  component: InventoryPage,
});

function InventoryPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("insumos");

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      <header className="mb-6">
        <h1 className="font-display text-3xl">Inventario</h1>
        <p className="text-sm text-muted-foreground">
          Gestiona tus insumos, stock, costos y recetas de productos.
        </p>
      </header>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="insumos">
            <Package className="size-4 mr-2" /> Insumos
          </TabsTrigger>
          <TabsTrigger value="recetas">
            <CookingPot className="size-4 mr-2" /> Recetas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="insumos">
          <InsumosTab />
        </TabsContent>

        <TabsContent value="recetas">
          <RecetasTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InsumosTab() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: items, isLoading } = useQuery({
    queryKey: ["inventory-items"],
    queryFn: () => inventoryApi.getItems(),
  });
  const { data: lowStockItems } = useQuery({
    queryKey: ["inventory-low-stock"],
    queryFn: () => inventoryApi.getLowStock(),
  });

  const [editItem, setEditItem] = useState<Partial<InventoryItem> | null>(null);
  const [stockAction, setStockAction] = useState<{
    item: InventoryItem;
    type: "entrada" | "salida" | "ajuste";
  } | null>(null);
  const [movementsItem, setMovementsItem] = useState<InventoryItem | null>(null);
  const [recipesItem, setRecipesItem] = useState<InventoryItem | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["inventory-items"] });
    qc.invalidateQueries({ queryKey: ["inventory-low-stock"] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 text-muted-foreground py-10">
        <Loader2 className="size-5 animate-spin" /> Cargando inventario...
      </div>
    );
  }

  const lowCount = lowStockItems?.length || 0;

  return (
    <>
      <header className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          {lowCount > 0 && (
            <Badge variant="destructive" className="text-sm px-3 py-1.5 gap-1.5">
              <AlertCircle className="size-4" /> {lowCount} insumo(s) con stock bajo
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => navigate({ to: "/compras" })}
            variant="outline"
            className="border-gold/30 text-gold hover:bg-gold/10"
          >
            <Truck className="size-4 mr-1" /> Compras
          </Button>
          <Button
            onClick={() => navigate({ to: "/compras" })}
            variant="outline"
            className="border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
          >
            <Sparkles className="size-4 mr-1" /> Surtir
          </Button>
          <Button
            onClick={() => setEditItem({ name: "", unit: "kg", stock: 0, min_stock: 0, cost_per_unit: 0 })}
            className="bg-linear-to-r from-gold to-gold-soft text-primary-foreground font-bold"
          >
            <Plus className="size-4 mr-1" /> Nuevo Insumo
          </Button>
        </div>
      </header>

      <div className="bg-card gold-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left">
            <tr>
              <th className="p-4">Insumo</th>
              <th className="p-4">Stock Actual</th>
              <th className="p-4">Unidad</th>
              <th className="p-4">Costo unitario</th>
              <th className="p-4">Estado</th>
              <th className="p-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {!items?.length ? (
              <tr>
                <td colSpan={6} className="p-10 text-center text-muted-foreground">
                  No hay insumos registrados.
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const isLow = item.stock <= item.min_stock;
                const isOut = item.stock <= 0;
                return (
                  <tr key={item.id} className="border-t border-border hover:bg-sidebar-accent/50 transition-colors">
                    <td className="p-4 font-medium">{item.name}</td>
                    <td className="p-4">
                      <span className={`font-bold ${isLow ? "text-destructive" : ""}`}>
                        {item.stock}
                      </span>
                      {isOut && <Badge variant="destructive" className="ml-2 text-[10px]">SIN STOCK</Badge>}
                    </td>
                    <td className="p-4 text-muted-foreground">{item.unit}</td>
                    <td className="p-4">{fmt(item.cost_per_unit)}</td>
                    <td className="p-4">
                      {isLow ? (
                        <span className="flex items-center gap-1 text-destructive font-semibold">
                          <AlertCircle className="size-3" /> Bajo stock
                        </span>
                      ) : (
                        <span className="text-success font-semibold">Normal</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" title="Añadir stock" onClick={() => setStockAction({ item, type: "entrada" })}>
                          <TrendingUp className="size-4 text-success" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Retirar stock" onClick={() => setStockAction({ item, type: "salida" })}>
                          <TrendingDown className="size-4 text-destructive" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Ajustar stock" onClick={() => setStockAction({ item, type: "ajuste" })}>
                          <RefreshCcw className="size-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Movimientos" onClick={() => setMovementsItem(item)}>
                          <History className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Productos que usan este insumo" onClick={() => setRecipesItem(item)}>
                          <Eye className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setEditItem(item)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="hover:text-destructive" onClick={async () => {
                          if (confirm("¿Eliminar este insumo?")) {
                            try {
                              await inventoryApi.deleteItem(item.id);
                              toast.success("Insumo eliminado");
                              invalidate();
                            } catch (e: any) { toast.error(e.message); }
                          }
                        }}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <InventoryDialog item={editItem} onClose={() => setEditItem(null)} onDone={invalidate} />
      <StockActionDialog action={stockAction} onClose={() => setStockAction(null)} onDone={() => invalidate()} />
      <MovementsDialog item={movementsItem} onClose={() => setMovementsItem(null)} />
      <RecipesByItemDialog item={recipesItem} onClose={() => setRecipesItem(null)} />
    </>
  );
}

function RecetasTab() {
  const [query, setQuery] = useState("");
  const [recipeProduct, setRecipeProduct] = useState<{ id: string; name: string } | null>(null);
  const { data: products, isLoading } = useQuery({
    queryKey: ["pos-prods"],
    queryFn: () => listProducts(),
  });

  const filtered = (products || []).filter((p: any) =>
    p.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      <header className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar producto..."
            className="pl-9"
          />
        </div>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : !filtered.length ? (
        <Card className="p-12 text-center text-muted-foreground">
          {query ? "Sin resultados." : "No hay productos registrados."}
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p: any) => (
            <ProductRecipeCard
              key={p.id}
              product={p}
              onEdit={() => setRecipeProduct({ id: p.id, name: p.name })}
            />
          ))}
        </div>
      )}

      <RecipeDialog
        productId={recipeProduct?.id ?? null}
        productName={recipeProduct?.name ?? null}
        onClose={() => setRecipeProduct(null)}
      />
    </>
  );
}

function ProductRecipeCard({ product, onEdit }: { product: any; onEdit: () => void }) {
  const { data: recipe, isLoading } = useQuery({
    queryKey: ["product-recipes", product.id],
    queryFn: () => inventoryApi.getRecipesEnriched(product.id),
  });

  const totalCost = (recipe || []).reduce(
    (sum, r) => sum + r.quantity * r.current_stock,
    0
  );

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-display text-lg leading-tight truncate">
            {product.emoji} {product.name}
          </div>
          <div className="text-xs text-muted-foreground">
            {product.categories?.name ?? "Sin categoría"}
          </div>
        </div>
        <Badge variant="outline" className="shrink-0">
          {recipe?.length || 0} insumo(s)
        </Badge>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-2"><Loader2 className="size-4 animate-spin" /></div>
      ) : !recipe?.length ? (
        <p className="text-sm text-muted-foreground italic">
          Sin receta definida.
        </p>
      ) : (
        <div className="space-y-1.5">
          {recipe.slice(0, 5).map((r) => (
            <div key={r.id} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground truncate mr-2">{r.item_name}</span>
              <span className="font-medium shrink-0">
                {r.quantity} {r.unit}
              </span>
            </div>
          ))}
          {recipe.length > 5 && (
            <p className="text-xs text-muted-foreground text-center pt-1">
              +{recipe.length - 5} insumos más
            </p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-border">
        <span className="text-xs text-muted-foreground">
          Costo aprox: {fmt(totalCost)}
        </span>
        <Button size="sm" variant="outline" onClick={onEdit} className="gap-1">
          <CookingPot className="size-3.5" /> Editar receta
        </Button>
      </div>
    </Card>
  );
}

// ─── Dialog components ───────────────────────────────────────

function InventoryDialog({
  item, onClose, onDone,
}: {
  item: Partial<InventoryItem> | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [form, setForm] = useState<Partial<InventoryItem>>(item || {});
  const [busy, setBusy] = useState(false);
  if (item && form.id !== item.id) setForm(item);

  const submit = async () => {
    setBusy(true);
    try {
      await inventoryApi.upsertItem(form);
      toast.success(form.id ? "Insumo actualizado" : "Insumo creado");
      onDone();
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card gold-border">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{form.id ? "Editar Insumo" : "Nuevo Insumo"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej. Elote blanco" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Unidad</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.unit || "kg"}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                <option value="kg">Kilogramos (kg)</option>
                <option value="gr">Gramos (gr)</option>
                <option value="l">Litros (l)</option>
                <option value="ml">Mililitros (ml)</option>
                <option value="pza">Piezas (pza)</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Costo x unidad</Label>
              <Input type="number" step="0.01" value={form.cost_per_unit ?? ""}
                onChange={(e) => setForm({ ...form, cost_per_unit: Number(e.target.value) })} placeholder="0.00" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Stock</Label>
              <Input type="number" step="0.01" value={form.stock ?? ""}
                onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Mínimo alerta</Label>
              <Input type="number" step="0.01" value={form.min_stock ?? ""}
                onChange={(e) => setForm({ ...form, min_stock: Number(e.target.value) })} placeholder="0" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={busy || !form.name} className="bg-linear-to-r from-gold to-gold-soft text-primary-foreground font-bold">
            {busy ? <Loader2 className="size-4 animate-spin" /> : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StockActionDialog({ action, onClose, onDone }: {
  action: { item: InventoryItem; type: "entrada" | "salida" | "ajuste" } | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const titles: Record<string, string> = { entrada: "Añadir Stock", salida: "Retirar Stock", ajuste: "Ajustar Stock" };
  const descs: Record<string, string> = {
    entrada: "Registra una compra o entrada de este insumo.",
    salida: "Registra una salida por consumo, merma o uso.",
    ajuste: "Establece el stock exacto actual (sobrescribe el valor).",
  };
  const btnLabels: Record<string, string> = { entrada: "Añadir", salida: "Retirar", ajuste: "Ajustar" };

  const submit = async () => {
    if (quantity <= 0) return;
    setBusy(true);
    try {
      const qty = action!.type === "ajuste" ? quantity : Math.abs(quantity);
      await inventoryApi.adjustStock(action!.item.id, action!.type, qty, notes || undefined);
      toast.success("Stock actualizado correctamente");
      onDone();
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!action} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card gold-border">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{action ? titles[action.type] : ""}</DialogTitle>
          <DialogDescription>{action ? descs[action.type] : ""}</DialogDescription>
        </DialogHeader>
        {action && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3 p-3 bg-surface-2 rounded-xl">
              <Box className="size-8 text-muted-foreground" />
              <div>
                <div className="font-semibold">{action.item.name}</div>
                <div className="text-sm text-muted-foreground">Stock actual: <span className="font-bold">{action.item.stock}</span> {action.item.unit}</div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{action.type === "ajuste" ? "Nuevo stock exacto" : "Cantidad"}</Label>
              <Input type="number" step={action.item.unit === "pza" ? "1" : "0.01"} value={quantity || ""}
                onChange={(e) => setQuantity(Math.max(0, Number(e.target.value)))} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Nota (opcional)</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder={action.type === "entrada" ? "Ej: Compra a proveedor" : "Ej: Merma, ajuste, etc."} />
            </div>
            {action.type === "ajuste" && (
              <div className="text-sm bg-surface-2 p-3 rounded-lg">
                {quantity > action.item.stock ? (
                  <span className="text-success">↗ Se añadirán {+(quantity - action.item.stock).toFixed(2)} {action.item.unit}</span>
                ) : quantity < action.item.stock ? (
                  <span className="text-destructive">↘ Se retirarán {+(action.item.stock - quantity).toFixed(2)} {action.item.unit}</span>
                ) : (
                  <span className="text-muted-foreground">Sin cambios</span>
                )}
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={busy || quantity <= 0}>
            {busy ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
            {action ? btnLabels[action.type] : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MovementsDialog({ item, onClose }: { item: InventoryItem | null; onClose: () => void }) {
  const { data: movements, isLoading } = useQuery({
    queryKey: ["inventory-movements", item?.id],
    queryFn: () => (item ? inventoryApi.getMovements(item.id) : Promise.resolve([])),
    enabled: !!item,
  });

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card gold-border max-w-xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Movimientos: {item?.name}</DialogTitle>
          <DialogDescription>Stock actual: <span className="font-bold">{item?.stock}</span> {item?.unit}</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="size-6 animate-spin" /></div>
        ) : !movements?.length ? (
          <div className="text-center py-8 text-muted-foreground">Sin movimientos registrados.</div>
        ) : (
          <div className="space-y-2">
            {movements.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3 bg-surface-2 rounded-xl text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  {m.type === "entrada" ? (
                    <TrendingUp className="size-4 text-success shrink-0" />
                  ) : m.type === "salida" ? (
                    <TrendingDown className="size-4 text-destructive shrink-0" />
                  ) : (
                    <RefreshCcw className="size-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="font-medium capitalize">{m.type}</div>
                    {m.notes && <div className="text-xs text-muted-foreground truncate max-w-[200px]">{m.notes}</div>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`font-bold ${m.type === "entrada" ? "text-success" : m.type === "salida" ? "text-destructive" : ""}`}>
                    {m.quantity > 0 ? "+" : ""}{m.quantity}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Stock: {m.stock_before} → {m.stock_after}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {new Date(m.created_at).toLocaleDateString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RecipesByItemDialog({ item, onClose }: { item: InventoryItem | null; onClose: () => void }) {
  const { data: recipes, isLoading } = useQuery({
    queryKey: ["inventory-recipes-by-item", item?.id],
    queryFn: () => (item ? inventoryApi.getRecipesByItem(item.id) : Promise.resolve([])),
    enabled: !!item,
  });

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card gold-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            <Package className="size-5 inline mr-2" />
            Productos que usan: {item?.name}
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="size-6 animate-spin" /></div>
        ) : !recipes?.length ? (
          <div className="text-center py-8 text-muted-foreground">Ningún producto usa este insumo.</div>
        ) : (
          <div className="space-y-2">
            {recipes.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between p-3 bg-surface-2 rounded-xl">
                <div className="font-semibold">{r.product_name}</div>
                <div className="text-right">
                  <div className="font-bold">{r.quantity} {item?.unit}</div>
                  <div className="text-xs text-muted-foreground">por unidad</div>
                </div>
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
