import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { purchasingApi, type Supplier, type PurchaseOrder, type PurchaseOrderItem } from "@/lib/purchasing.functions";
import { inventoryApi, type InventoryItem } from "@/lib/inventory.functions";
import {
  Truck, PackagePlus, Plus, Pencil, Trash2, Loader2, Search,
  Save, X, Phone, Mail, MapPin, FileText, Eye, CheckCircle2,
  AlertCircle, Box, ArrowRight, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { fmt } from "@/store/cart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/compras")({
  head: () => ({ meta: [{ title: "Compras · Esquites La Parroquia" }] }),
  component: ComprasPage,
});

function ComprasPage() {
  const [tab, setTab] = useState("proveedores");
  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      <header className="mb-6">
        <h1 className="font-display text-3xl flex items-center gap-3">
          <Truck className="size-8 text-gold" /> Compras
        </h1>
        <p className="text-sm text-muted-foreground">Proveedores y órdenes de compra.</p>
      </header>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="proveedores"><Truck className="size-4 mr-2" /> Proveedores</TabsTrigger>
          <TabsTrigger value="ordenes"><FileText className="size-4 mr-2" /> Órdenes de Compra</TabsTrigger>
        </TabsList>
        <TabsContent value="proveedores"><ProveedoresTab /></TabsContent>
        <TabsContent value="ordenes"><OrdenesTab /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── PROVEEDORES TAB ─── */
function ProveedoresTab() {
  const qc = useQueryClient();
  const { data: suppliers, isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => purchasingApi.getSuppliers(),
  });
  const [search, setSearch] = useState("");
  const [edit, setEdit] = useState<Partial<Supplier> | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["suppliers"] });

  const filtered = (suppliers || []).filter((s: Supplier) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.contact_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (data: Partial<Supplier>) => {
    try {
      await purchasingApi.upsertSupplier({ ...data, created_at: data.id ? undefined : new Date().toISOString() });
      toast.success(data.id ? "Proveedor actualizado" : "Proveedor registrado");
      setEdit(null);
      invalidate();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este proveedor?")) return;
    try {
      await purchasingApi.deleteSupplier(id);
      toast.success("Proveedor eliminado");
      invalidate();
    } catch (e: any) { toast.error(e.message); }
  };

  if (isLoading) return <div className="flex justify-center p-10"><Loader2 className="size-6 animate-spin text-gold" /></div>;

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar proveedor..." className="pl-9" />
        </div>
        <Button onClick={() => setEdit({ name: "" })} className="bg-linear-to-r from-gold to-gold-soft text-primary-foreground font-bold">
          <Plus className="size-4 mr-1" /> Nuevo Proveedor
        </Button>
      </div>

      <div className="bg-card gold-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left">
            <tr>
              <th className="p-4">Nombre</th>
              <th className="p-4">Contacto</th>
              <th className="p-4">Teléfono</th>
              <th className="p-4 hidden md:table-cell">Email</th>
              <th className="p-4 text-right w-28">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {!filtered.length ? (
              <tr><td colSpan={5} className="p-10 text-center text-muted-foreground">No hay proveedores registrados.</td></tr>
            ) : (
              filtered.map((s: Supplier) => (
                <tr key={s.id} className="border-t border-border hover:bg-sidebar-accent/50 transition-colors">
                  <td className="p-4 font-medium">{s.name}</td>
                  <td className="p-4 text-muted-foreground">{s.contact_name || "—"}</td>
                  <td className="p-4">{s.phone ? <span className="flex items-center gap-1"><Phone className="size-3" /> {s.phone}</span> : "—"}</td>
                  <td className="p-4 hidden md:table-cell">{s.email ? <span className="flex items-center gap-1"><Mail className="size-3" /> {s.email}</span> : "—"}</td>
                  <td className="p-4">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEdit(s)}><Pencil className="size-4" /></Button>
                      <Button variant="ghost" size="icon" className="hover:text-destructive" onClick={() => handleDelete(s.id)}><Trash2 className="size-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <SupplierDialog data={edit} onClose={() => setEdit(null)} onSave={handleSave} />
    </>
  );
}

function SupplierDialog({ data, onClose, onSave }: { data: Partial<Supplier> | null; onClose: () => void; onSave: (d: Partial<Supplier>) => void }) {
  const [form, setForm] = useState<Partial<Supplier>>(data || {});
  if (!data) return null;
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>{data.id ? "Editar Proveedor" : "Nuevo Proveedor"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nombre *</Label><Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Persona de contacto</Label><Input value={form.contact_name || ""} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Teléfono</Label><Input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          </div>
          <div><Label>Dirección</Label><Input value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div><Label>Notas</Label><Input value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave(form)} disabled={!form.name?.trim()} className="bg-gold text-black font-bold">Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── ÓRDENES DE COMPRA TAB ─── */
function OrdenesTab() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["purchase-orders"],
    queryFn: () => purchasingApi.getPurchaseOrders(),
  });
  const { data: suppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => purchasingApi.getSuppliers(),
  });

  const enriched = (orders || []).map((o: PurchaseOrder) => ({
    ...o,
    supplier_name: (suppliers || []).find((s: Supplier) => s.id === o.supplier_id)?.name || "—",
  }));

  const invalidate = () => qc.invalidateQueries({ queryKey: ["purchase-orders"] });

  if (isLoading) return <div className="flex justify-center p-10"><Loader2 className="size-6 animate-spin text-gold" /></div>;

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="text-sm text-muted-foreground">{enriched.length} órdenes registradas</p>
        <Button onClick={() => setCreating(true)} className="bg-linear-to-r from-gold to-gold-soft text-primary-foreground font-bold">
          <PackagePlus className="size-4 mr-1" /> Nueva Orden
        </Button>
      </div>

      <div className="bg-card gold-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left">
            <tr>
              <th className="p-4">Folio</th>
              <th className="p-4">Proveedor</th>
              <th className="p-4">Estatus</th>
              <th className="p-4 text-right">Total</th>
              <th className="p-4 hidden md:table-cell">Creada</th>
              <th className="p-4 text-right w-32">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {!enriched.length ? (
              <tr><td colSpan={6} className="p-10 text-center text-muted-foreground">No hay órdenes de compra.</td></tr>
            ) : (
              enriched.map((o: PurchaseOrder & { supplier_name: string }) => (
                <tr key={o.id} className="border-t border-border hover:bg-sidebar-accent/50 transition-colors">
                  <td className="p-4 font-medium">{o.folio || o.id.slice(0, 8)}</td>
                  <td className="p-4">{o.supplier_name}</td>
                  <td className="p-4">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="p-4 text-right font-bold">{fmt(o.total)}</td>
                  <td className="p-4 hidden md:table-cell text-xs text-muted-foreground">
                    {o.created_at ? new Date(o.created_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-1">
                      {o.status === "borrador" && (
                        <>
                          <Button variant="ghost" size="icon" title="Recibir" onClick={async () => {
                            try {
                              const r = await purchasingApi.receive(o.id);
                              toast.success(`Orden recibida (${r.items_processed} insumos actualizados)`);
                              invalidate();
                              qc.invalidateQueries({ queryKey: ["inventory-items"] });
                            } catch (e: any) { toast.error(e.message); }
                          }}>
                            <CheckCircle2 className="size-4 text-success" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Eliminar" className="hover:text-destructive" onClick={async () => {
                            if (!confirm("¿Eliminar esta orden?")) return;
                            try {
                              const items = await purchasingApi.getItems(o.id);
                              for (const item of items) await purchasingApi.deleteItem(item.id);
                              await purchasingApi.deletePurchaseOrder(o.id);
                              toast.success("Orden eliminada");
                              invalidate();
                            } catch (e: any) { toast.error(e.message); }
                          }}>
                            <Trash2 className="size-4" />
                          </Button>
                        </>
                      )}
                      {o.status === "recibida" && (
                        <span className="text-xs text-muted-foreground px-2">
                          {o.received_at ? new Date(o.received_at).toLocaleDateString() : ""}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <CreateOrderDialog open={creating} onClose={() => setCreating(false)} onDone={() => { setCreating(false); invalidate(); }} />
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; class: string }> = {
    borrador: { label: "Borrador", class: "bg-amber-500/20 text-amber-600 border-amber-500/30" },
    enviada: { label: "Enviada", class: "bg-blue-500/20 text-blue-600 border-blue-500/30" },
    recibida: { label: "Recibida", class: "bg-green-500/20 text-green-600 border-green-500/30" },
    cancelada: { label: "Cancelada", class: "bg-red-500/20 text-red-600 border-red-500/30" },
  };
  const m = map[status] || { label: status, class: "bg-surface-2 text-muted-foreground" };
  return <Badge className={`${m.class} text-[10px]`}>{m.label}</Badge>;
}

/* ─── CREATE ORDER DIALOG ─── */
function CreateOrderDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const qc = useQueryClient();
  const [step, setStep] = useState<"suggest" | "edit">("suggest");

  const { data: suggestData, isLoading: suggestLoading } = useQuery({
    queryKey: ["purchase-suggest"],
    queryFn: () => purchasingApi.suggest(7),
    enabled: open,
  });

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => purchasingApi.getSuppliers(),
    enabled: open,
  });

  const { data: inventoryItems } = useQuery({
    queryKey: ["inventory-items"],
    queryFn: () => inventoryApi.getItems(),
    enabled: open,
  });

  const [supplierId, setSupplierId] = useState("");
  const [items, setItems] = useState<{ inventory_item_id: string; item_name: string; unit: string; quantity: number; unit_cost: number }[]>([]);

  const applySuggestions = () => {
    if (!suggestData) return;
    setItems(suggestData.suggestions.map((s) => ({
      inventory_item_id: s.inventory_item_id,
      item_name: s.item_name,
      unit: s.unit,
      quantity: s.suggested_qty,
      unit_cost: s.unit_cost,
    })));
    setStep("edit");
  };

  const handleSave = async () => {
    if (!items.length) { toast.error("Agrega al menos un insumo"); return; }
    try {
      const folio = "OC-" + Date.now().toString(36).toUpperCase();
      const total = items.reduce((sum, i) => sum + i.quantity * i.unit_cost, 0);
      const order = await purchasingApi.upsertPurchaseOrder({
        supplier_id: supplierId || undefined,
        folio,
        status: "borrador",
        total,
        created_at: new Date().toISOString(),
      }) as any;

      for (const item of items) {
        await purchasingApi.upsertItem({
          purchase_order_id: order.id || order.lastID,
          inventory_item_id: item.inventory_item_id,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          subtotal: item.quantity * item.unit_cost,
        });
      }

      qc.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast.success(`Orden ${folio} creada`);
      onDone();
    } catch (e: any) { toast.error(e.message); }
  };

  const addItem = () => {
    setItems([...items, { inventory_item_id: "", item_name: "", unit: "pza", quantity: 1, unit_cost: 0 }]);
  };

  const updateItem = (idx: number, field: string, value: any) => {
    const copy = [...items];
    (copy[idx] as any)[field] = value;
    if (field === "inventory_item_id") {
      const inv = (inventoryItems || []).find((i: InventoryItem) => i.id === value);
      if (inv) { copy[idx].item_name = inv.name; copy[idx].unit = inv.unit; copy[idx].unit_cost = inv.cost_per_unit; }
    }
    setItems(copy);
  };

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const totalOrder = items.reduce((sum, i) => sum + i.quantity * i.unit_cost, 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Nueva Orden de Compra</DialogTitle></DialogHeader>

        {step === "suggest" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Analizando ventas de los últimos 7 días y stock actual para sugerir una orden...
            </p>
            {suggestLoading ? (
              <div className="flex items-center gap-3 text-muted-foreground py-6">
                <Loader2 className="size-5 animate-spin" /> Generando sugerencia...
              </div>
            ) : suggestData && suggestData.suggestions.length > 0 ? (
              <>
                <div className="bg-surface-2 rounded-xl p-4 max-h-60 overflow-y-auto space-y-2">
                  {suggestData.suggestions.map((s, i) => (
                    <div key={i} className="flex items-center justify-between text-sm bg-card rounded-lg p-3 border border-border">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{s.item_name}</div>
                        <div className="text-xs text-muted-foreground">
                          Stock: {s.current_stock} {s.unit} · Min: {s.min_stock} · Sugerido: {s.suggested_qty}
                        </div>
                        <div className="text-[10px] text-muted-foreground">Por: {s.reason}</div>
                      </div>
                      <Badge className="ml-2 shrink-0">{s.suggested_qty} {s.unit}</Badge>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={onClose}>Cancelar</Button>
                  <Button onClick={applySuggestions} className="bg-gold text-black font-bold flex-1">
                    <Sparkles className="size-4 mr-1" /> Usar Sugerencia
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <AlertCircle className="size-8 mx-auto mb-2" />
                <p>No hay insumos por sugerir. Todo está en stock suficiente.</p>
                <Button variant="outline" className="mt-4" onClick={() => setStep("edit")}>Crear orden manual</Button>
              </div>
            )}
          </div>
        )}

        {step === "edit" && (
          <div className="space-y-4">
            <div>
              <Label>Proveedor (opcional)</Label>
              <select
                className="w-full bg-surface border border-border rounded-lg p-2 text-sm outline-none focus:border-gold"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
              >
                <option value="">Sin proveedor</option>
                {(suppliers || []).map((s: Supplier) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-surface-2 rounded-xl p-3 border border-border">
                  <div className="flex-1 min-w-0">
                    {item.inventory_item_id ? (
                      <div className="text-sm font-medium truncate">{item.item_name}</div>
                    ) : (
                      <select
                        className="w-full bg-surface border border-border rounded-lg p-1.5 text-sm outline-none focus:border-gold"
                        value={item.inventory_item_id}
                        onChange={(e) => updateItem(idx, "inventory_item_id", e.target.value)}
                      >
                        <option value="">Seleccionar insumo...</option>
                        {(inventoryItems || []).map((inv: InventoryItem) => (
                          <option key={inv.id} value={inv.id}>{inv.name} ({inv.stock} {inv.unit})</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <Input
                    type="number"
                    className="w-20 text-sm"
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, "quantity", Math.max(0, Number(e.target.value)))}
                    min={0}
                    step={0.5}
                  />
                  <Input
                    type="number"
                    className="w-20 text-sm"
                    value={item.unit_cost}
                    onChange={(e) => updateItem(idx, "unit_cost", Math.max(0, Number(e.target.value)))}
                    min={0}
                    step={0.01}
                  />
                  <span className="text-xs text-muted-foreground w-16 text-right">{fmt(item.quantity * item.unit_cost)}</span>
                  <Button variant="ghost" size="icon" className="size-7 shrink-0 hover:text-destructive" onClick={() => removeItem(idx)}>
                    <X className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            <Button variant="outline" onClick={addItem} className="w-full">
              <Plus className="size-4 mr-1" /> Agregar insumo
            </Button>

            <div className="text-right font-bold text-lg">{fmt(totalOrder)}</div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep("suggest")}>← Volver</Button>
              <Button onClick={handleSave} disabled={!items.length} className="bg-gold text-black font-bold">
                <Save className="size-4 mr-1" /> Crear Orden
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
