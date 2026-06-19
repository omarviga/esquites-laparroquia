# Evolution Proposal: Registrar que window.open() para impresión de tickets falla en tablets; usar printTicketBrowser() con iframe en su lugar

- Proposal-ID: evo-2026-06-19-tools-browser-print-iframe-not-popup
- Status: approved
- Signature: tools-browser-print-iframe-not-popup
- Created-At: 2026-06-19 02:12
- Last-Seen-At: 2026-06-19 02:12
- Target-File: TOOLS.md
- Trigger-Type: preference
- Confidence: medium

## Why This Matters
- Registrar que window.open() para impresión de tickets falla en tablets; usar printTicketBrowser() con iframe en su lugar

## Evidence
- Interactive proposal card was present in the session UI.
- The original pending draft file was unavailable at approval time.
- AutoClaw reconstructed this draft from the proposal payload so the review result can still be recorded.

## Duplicate Check
- Checked: pending draft path + signature/proposal fallback
- Result: original draft file missing
- Decision: create surrogate draft from proposal payload

## Proposed Change
### Browser Print Pitfall

# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that is unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

### Browser Printing (Ticket)

**Pitfall:** `window.open()` with URL hash data for ticket printing fails on tablets and mobile browsers. Popup blockers prevent the window from opening, or the hash payload is truncated/lost.

**Use:** `printTicketBrowser(data: TicketPrintData)` from `src/lib/utils.ts`
- Injects a hidden `<iframe>` with full HTML + inline CSS tailored for 80mm thermal paper
- Calls `iframe.contentWindow.print()` directly — no popups, no page reloads, no hash parsing
- Works on desktop, Android tablet, iPad, and mobile Chrome
- Data flows through in-memory string interpolation, not URL encoding

**Example:**
```ts
import { printTicketBrowser } from "@/lib/utils";

printTicketBrowser({
  cashier: "Cajero",
  folio: "00123",
  createdAt: new Date().toISOString(),
  subtotal: 100, tax: 16, total: 116,
  paymentMethod: "efectivo",
  cashReceived: 200, changeAmount: 84,
  items: [{ name: "Esquite grande", quantity: 2, unitPrice: 50, modifiers: ["Chile", "Crema"] }],
});
```

**Do NOT use:**
```ts
// ❌ Fails on tablets:
const hash = buildTicketHash(data);
window.open(`/ticket/print#${hash}`, "_blank", "width=380,height=600");
```

## Apply Plan
1. Keep this reconstructed draft as the approval artifact.
2. Record the proposal content exactly as shown in the interactive card.
3. Append an audit note after approval or rejection.

## User Approval
- Approve: 批准 evo-2026-06-19-tools-browser-print-iframe-not-popup
- Reject: 拒绝 evo-2026-06-19-tools-browser-print-iframe-not-popup