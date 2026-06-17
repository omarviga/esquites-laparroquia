<<<<<<< HEAD

import { useState, useEffect } from "react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { fmt } from "@/store/cart";

const BILLS = [1000, 500, 200, 100, 50, 20];
const COINS = [20, 10, 5, 2, 1, 0.5];

export type Breakdown = Record<string, number>;

interface Props {
    onTotalChange: (total: number) => void;
    onBreakdownChange: (breakdown: Breakdown) => void;
    initialBreakdown?: Breakdown;
}

export function DenominationCounter({ onTotalChange, onBreakdownChange, initialBreakdown = {} }: Props) {
    const [breakdown, setBreakdown] = useState<Breakdown>(initialBreakdown);

    useEffect(() => {
        const total = Object.entries(breakdown).reduce((acc, [den, qty]) => acc + (parseFloat(den) * qty), 0);
        onTotalChange(total);
        onBreakdownChange(breakdown);
    }, [breakdown]);

    const updateQty = (den: number, val: string) => {
        const qty = parseInt(val) || 0;
        setBreakdown(prev => ({ ...prev, [den.toString()]: qty }));
    };

    return (
        <div className="space-y-6">
            <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Billetes</h3>
                <div className="grid grid-cols-2 gap-3">
                    {BILLS.map(b => (
                        <div key={b} className="flex items-center gap-3 bg-surface p-2 rounded-xl border border-border">
                            <div className="w-12 text-sm font-bold text-gold">${b}</div>
                            <Input
                                type="number"
                                placeholder="0"
                                className="h-9 text-center bg-surface-2"
                                value={breakdown[b.toString()] || ""}
                                onChange={e => updateQty(b, e.target.value)}
                            />
                            <div className="w-20 text-right text-[10px] font-mono text-muted-foreground">
                                {fmt((breakdown[b.toString()] || 0) * b)}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Monedas</h3>
                <div className="grid grid-cols-2 gap-3">
                    {COINS.map(c => (
                        <div key={c} className="flex items-center gap-3 bg-surface p-2 rounded-xl border border-border">
                            <div className="w-12 text-sm font-bold text-gold-soft">${c}</div>
                            <Input
                                type="number"
                                placeholder="0"
                                className="h-9 text-center bg-surface-2"
                                value={breakdown[c.toString()] || ""}
                                onChange={e => updateQty(c, e.target.value)}
                            />
                            <div className="w-20 text-right text-[10px] font-mono text-muted-foreground">
                                {fmt((breakdown[c.toString()] || 0) * c)}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <div className="pt-4 border-t border-border flex justify-between items-center">
                <span className="text-sm font-bold uppercase">Total calculado:</span>
                <span className="text-2xl font-display font-black gold-text">
                    {fmt(Object.entries(breakdown).reduce((acc, [den, qty]) => acc + (parseFloat(den) * qty), 0))}
                </span>
            </div>
        </div>
    );
=======
import { useMemo, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { fmt } from "@/store/cart";

const DENOMS = [
  { value: 1000, label: "$1,000", type: "billete" },
  { value: 500, label: "$500", type: "billete" },
  { value: 200, label: "$200", type: "billete" },
  { value: 100, label: "$100", type: "billete" },
  { value: 50, label: "$50", type: "billete" },
  { value: 20, label: "$20", type: "billete" },
  { value: 20, label: "$20 mon.", type: "moneda" },
  { value: 10, label: "$10", type: "moneda" },
  { value: 5, label: "$5", type: "moneda" },
  { value: 2, label: "$2", type: "moneda" },
  { value: 1, label: "$1", type: "moneda" },
  { value: 0.5, label: "$0.50", type: "moneda" },
];

export type Breakdown = { value: number; label: string; count: number; subtotal: number }[];

export function DenominationCounter({
  onChange,
  initial,
}: {
  onChange: (total: number, breakdown: Breakdown) => void;
  initial?: Record<string, number>;
}) {
  const [counts, setCounts] = useState<number[]>(() =>
    DENOMS.map((d) => initial?.[`${d.type}-${d.value}-${d.label}`] ?? 0),
  );

  const { total, breakdown } = useMemo(() => {
    const b = DENOMS.map((d, i) => ({
      value: d.value,
      label: d.label,
      count: counts[i] || 0,
      subtotal: (counts[i] || 0) * d.value,
    }));
    return { total: b.reduce((s, r) => s + r.subtotal, 0), breakdown: b };
  }, [counts]);

  useEffect(() => {
    onChange(total, breakdown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  const set = (i: number, v: number) =>
    setCounts((p) => p.map((c, j) => (i === j ? Math.max(0, Math.floor(v)) : c)));

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_auto_auto] gap-2 text-xs font-semibold text-muted-foreground px-2">
        <span>Denominación</span>
        <span className="w-24 text-center">Cantidad</span>
        <span className="w-24 text-right">Subtotal</span>
      </div>
      <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
        {DENOMS.map((d, i) => (
          <div key={i} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center bg-surface-2 rounded-lg p-2">
            <span className="text-sm font-medium">
              {d.label} <span className="text-[10px] text-muted-foreground capitalize">({d.type})</span>
            </span>
            <Input
              type="number"
              min="0"
              value={counts[i] || ""}
              onChange={(e) => set(i, Number(e.target.value))}
              className="w-24 h-9 text-center"
              placeholder="0"
            />
            <span className="w-24 text-right font-mono text-sm">{fmt(breakdown[i].subtotal)}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-between items-center bg-gold/10 rounded-lg p-3 border border-gold/30">
        <span className="text-sm font-semibold">Total contado</span>
        <span className="font-display text-2xl gold-text">{fmt(total)}</span>
      </div>
    </div>
  );
>>>>>>> cb9696df48d7aa87774d2acfa991ca2202ecc86c
}
