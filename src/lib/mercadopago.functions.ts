import { getAuthContext } from "./auth.helper";
import { getServerConfig } from "./config.server";
import { z } from "zod";

// ═════════════════════════════════════════════════════════════
//  PAYMENT PROVIDER UNIFIED API
//  ─────────────────────────────────────────────────────────
//  Supports: Mercado Pago Point (terminal físico), MP QR,
//            PayPal Zettle (terminal)
// ═════════════════════════════════════════════════════════════

const MP_API = "https://api.mercadopago.com";

async function mpRequest(token: string, path: string, opts: RequestInit = {}) {
  const res = await fetch(`${MP_API}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`MercadoPago ${res.status}: ${body}`);
  }
  return res.json();
}

// ─── Shared types ─────────────────────────────────────────────────────

export interface PaymentResult {
  success: boolean;
  status: string; // "pending" | "approved" | "rejected" | "cancelled"
  paymentId: string;
  detail?: string;
  cardBrand?: string;
  lastFour?: string;
}

// ─── Provider config ──────────────────────────────────────────────────

export type PaymentProvider = "mercadopago_point" | "mercadopago_qr" | "zettle" | "none";

// ═════════════════════════════════════════════════════════════
//  MERCADO PAGO POINT — Terminal físico
// ═════════════════════════════════════════════════════════════

const pointIntentSchema = z.object({
  deviceId: z.string().min(1, "ID del dispositivo requerido"),
  amount: z.number().positive(),
  description: z.string().min(1),
  externalReference: z.string(),
});

export type PointIntentInput = z.infer<typeof pointIntentSchema>;

export const createPointPaymentIntent = async (data: PointIntentInput) => {
  await getAuthContext(); // ensure authenticated
  const cfg = getServerConfig();
  const token = cfg.mercadopagoAccessToken;
  if (!token) throw new Error("MERCADOPAGO_ACCESS_TOKEN no configurado");

  const { deviceId, amount, description, externalReference } = data;

  const result = await mpRequest(
    token,
    `/point/integration-api/devices/${deviceId}/payment-intents`,
    {
      method: "POST",
      body: JSON.stringify({
        amount,
        description,
        payment: {
          installments: 1,
          type: "credit_card",
        },
        external_reference: externalReference,
        notification_url:
          "https://esquites-laparroquia.vercel.app/api/mp-webhook",
      }),
    }
  );

  return {
    intentId: result.id,
    status: result.status,
  };
};

// ─── Check Point terminal payment status ──────────────────────────────

const checkPointSchema = z.object({
  intentId: z.string(),
});

export const checkPointPaymentStatus = async (data: z.infer<typeof checkPointSchema>) => {
  await getAuthContext();
  const cfg = getServerConfig();
  const token = cfg.mercadopagoAccessToken;
  if (!token) throw new Error("MERCADOPAGO_ACCESS_TOKEN no configurado");

  const result = await mpRequest(
    token,
    `/point/integration-api/payment-intents/${data.intentId}`
  );

  const isFinished = ["FINISHED", "CANCELED", "ERROR"].includes(result.status);
  const isApproved = result.status === "FINISHED";

  return {
    finished: isFinished,
    approved: isApproved,
    status: result.status,
    paymentId: result.payment_id?.toString(),
    detail: result.status_detail,
    cardBrand: result.payment?.card?.issuer?.name,
    lastFour: result.payment?.card?.last_four_digits,
  };
};

// ─── Cancel Point payment intent ──────────────────────────────────────

const cancelPointSchema = z.object({
  deviceId: z.string(),
  intentId: z.string(),
});

export const cancelPointPaymentIntent = async (data: z.infer<typeof cancelPointSchema>) => {
  await getAuthContext();
  const cfg = getServerConfig();
  const token = cfg.mercadopagoAccessToken;
  if (!token) throw new Error("MERCADOPAGO_ACCESS_TOKEN no configurado");

  await mpRequest(
    token,
    `/point/integration-api/devices/${data.deviceId}/payment-intents/${data.intentId}`,
    { method: "DELETE" }
  );
  return { ok: true };
};

// ═════════════════════════════════════════════════════════════
//  MERCADO PAGO QR — Pago digital con código QR
// ═════════════════════════════════════════════════════════════

const createPreferenceSchema = z.object({
  externalReference: z.string(),
  title: z.string().min(1),
  amount: z.number().positive(),
  description: z.string().optional(),
  notificationUrl: z.string().optional(),
});

export type CreatePreferenceInput = z.infer<typeof createPreferenceSchema>;

export const createPaymentPreference = async (data: CreatePreferenceInput) => {
  await getAuthContext();
  const cfg = getServerConfig();
  const token = cfg.mercadopagoAccessToken;
  if (!token) throw new Error("MERCADOPAGO_ACCESS_TOKEN no configurado");

  const { externalReference, title, amount, description, notificationUrl } = data;

  const preference = await mpRequest(token, "/checkout/preferences", {
    method: "POST",
    body: JSON.stringify({
      items: [
        {
          title: description || title,
          quantity: 1,
          unit_price: amount,
          currency_id: "MXN",
        },
      ],
      external_reference: externalReference,
      notification_url:
        notificationUrl ||
        "https://esquites-laparroquia.vercel.app/api/mp-webhook",
      back_urls: {
        success: "https://esquites-laparroquia.vercel.app/pos",
        pending: "https://esquites-laparroquia.vercel.app/pos",
        failure: "https://esquites-laparroquia.vercel.app/pos",
      },
      auto_return: "approved",
      statement_descriptor: "Esquites La Parroquia",
    }),
  });

  const initPoint = preference.init_point;

  let qrBase64 = "";
  try {
    const qrRes = await fetch(
      `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(initPoint)}`
    );
    if (qrRes.ok) {
      const buffer = await qrRes.arrayBuffer();
      // Convert ArrayBuffer to base64 string (browser-compatible)
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      qrBase64 = btoa(binary);
    }
  } catch {}

  return {
    preferenceId: preference.id,
    initPoint,
    sandboxInitPoint: preference.sandbox_init_point,
    qrBase64,
  };
};

// ─── Check QR payment status ──────────────────────────────────────────

const checkPaymentSchema = z.object({
  externalReference: z.string(),
});

export type CheckPaymentInput = z.infer<typeof checkPaymentSchema>;
export type CheckPaymentResult = {
  found: boolean;
  paid: boolean;
  paymentId?: string;
  status?: string;
  statusDetail?: string;
  amount?: number;
  paymentMethod?: string;
};

export const checkPaymentStatus = async (data: CheckPaymentInput) => {
  await getAuthContext();
  const cfg = getServerConfig();
  const token = cfg.mercadopagoAccessToken;
  if (!token) throw new Error("MERCADOPAGO_ACCESS_TOKEN no configurado");

  const { externalReference } = data;

  const result = await mpRequest(
    token,
    `/v1/payments/search?external_reference=${encodeURIComponent(externalReference)}&sort=date_created&criteria=desc&limit=5`
  );

  const payment = result.results?.[0];
  if (!payment) return { found: false, paid: false };

  return {
    found: true,
    paid: payment.status === "approved",
    paymentId: payment.id?.toString(),
    status: payment.status,
    statusDetail: payment.status_detail,
    amount: payment.transaction_amount,
    paymentMethod: payment.payment_method_id,
  };
};

// ═════════════════════════════════════════════════════════════
//  PAYPAL ZETTLE — Terminal PayPal
// ═════════════════════════════════════════════════════════════

const ZETTLE_API = "https://purchase.izettle.com";

async function zettleRequest(token: string, path: string, opts: RequestInit = {}) {
  const res = await fetch(`${ZETTLE_API}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Zettle ${res.status}: ${body}`);
  }
  return res.json();
}

const zettlePaymentSchema = z.object({
  amount: z.number().positive(),
  description: z.string().min(1),
  externalReference: z.string(),
});

export const createZettlePayment = async (data: z.infer<typeof zettlePaymentSchema>) => {
  await getAuthContext();
  const cfg = getServerConfig();
  const token = cfg.zettleApiKey;
  if (!token) throw new Error("ZETTLE_API_KEY no configurado");

  const { amount, description, externalReference } = data;

  const result = await zettleRequest(token, "/purchases/v2", {
    method: "POST",
    body: JSON.stringify({
      purchase: {
        products: [
          {
            name: description,
            unitPrice: {
              amount: Math.round(amount * 100),
              currencyId: "MXN",
            },
            quantity: 1,
          },
        ],
        payments: [
          {
            uuid: `ext-${externalReference}`,
            amount: Math.round(amount * 100),
          },
        ],
        reference: externalReference,
      },
    }),
  });

  return {
    purchaseUuid: result.purchaseUUID || result.id,
    status: "pending",
  };
};

const checkZettleSchema = z.object({
  purchaseUuid: z.string(),
});

export const checkZettlePaymentStatus = async (data: z.infer<typeof checkZettleSchema>) => {
  await getAuthContext();
  const cfg = getServerConfig();
  const token = cfg.zettleApiKey;
  if (!token) throw new Error("ZETTLE_API_KEY no configurado");

  const result = await zettleRequest(
    token,
    `/purchases/v2/${data.purchaseUuid}`
  );

  const isCompleted = result.purchase?.status === "COMPLETED";
  const payment = result.purchase?.payments?.[0];

  return {
    finished: isCompleted || result.purchase?.status === "FAILED",
    approved: isCompleted,
    status: result.purchase?.status,
    paymentId: payment?.uuid,
    cardBrand: payment?.attributes?.cardPaymentEntryMode,
    lastFour: payment?.attributes?.maskedPan?.slice(-4),
  };
};

// ═════════════════════════════════════════════════════════════
//  UNIFIED TERMINAL PAYMENT (auto-detect provider)
// ═════════════════════════════════════════════════════════════

const terminalPaymentSchema = z.object({
  provider: z.enum(["mercadopago_point", "zettle"]),
  deviceId: z.string().optional(),
  amount: z.number().positive(),
  description: z.string().min(1),
  externalReference: z.string(),
});

export const createTerminalPayment = async (data: z.infer<typeof terminalPaymentSchema>) => {
  await getAuthContext();
  const cfg = getServerConfig();

  if (data.provider === "mercadopago_point") {
    if (!data.deviceId) throw new Error("deviceId requerido para MP Point");
    const token = cfg.mercadopagoAccessToken;
    if (!token) throw new Error("MERCADOPAGO_ACCESS_TOKEN no configurado");

    const result = await mpRequest(
      token,
      `/point/integration-api/devices/${data.deviceId}/payment-intents`,
      {
        method: "POST",
        body: JSON.stringify({
          amount: data.amount,
          description: data.description,
          payment: { installments: 1, type: "credit_card" },
          external_reference: data.externalReference,
          notification_url:
            "https://esquites-laparroquia.vercel.app/api/mp-webhook",
        }),
      }
    );

    return {
      provider: "mercadopago_point" as const,
      terminalId: result.id,
      status: result.status,
    };
  }

  if (data.provider === "zettle") {
    const token = cfg.zettleApiKey;
    if (!token) throw new Error("ZETTLE_API_KEY no configurado");

    const result = await zettleRequest(token, "/purchases/v2", {
      method: "POST",
      body: JSON.stringify({
        purchase: {
          products: [
            {
              name: data.description,
              unitPrice: {
                amount: Math.round(data.amount * 100),
                currencyId: "MXN",
              },
              quantity: 1,
            },
          ],
          payments: [
            {
              uuid: `ext-${data.externalReference}`,
              amount: Math.round(data.amount * 100),
            },
          ],
          reference: data.externalReference,
        },
      }),
    });

    return {
      provider: "zettle" as const,
      terminalId: result.purchaseUUID || result.id,
      status: "pending",
    };
  }

  throw new Error("Provider no soportado");
};

const checkTerminalSchema = z.object({
  provider: z.enum(["mercadopago_point", "zettle"]),
  terminalId: z.string(),
});

export const checkTerminalPaymentStatus = async (data: z.infer<typeof checkTerminalSchema>) => {
  await getAuthContext();
  const cfg = getServerConfig();

  if (data.provider === "mercadopago_point") {
    const token = cfg.mercadopagoAccessToken;
    if (!token) throw new Error("MERCADOPAGO_ACCESS_TOKEN no configurado");

    const result = await mpRequest(
      token,
      `/point/integration-api/payment-intents/${data.terminalId}`
    );

    return {
      finished: ["FINISHED", "CANCELED", "ERROR"].includes(result.status),
      approved: result.status === "FINISHED",
      status: result.status,
      paymentId: result.payment_id?.toString(),
      detail: result.status_detail,
      cardBrand: result.payment?.card?.issuer?.name,
      lastFour: result.payment?.card?.last_four_digits,
    };
  }

  if (data.provider === "zettle") {
    const token = cfg.zettleApiKey;
    if (!token) throw new Error("ZETTLE_API_KEY no configurado");

    const result = await zettleRequest(
      token,
      `/purchases/v2/${data.terminalId}`
    );

    const isCompleted = result.purchase?.status === "COMPLETED";
    const payment = result.purchase?.payments?.[0];

    return {
      finished: isCompleted || result.purchase?.status === "FAILED",
      approved: isCompleted,
      status: result.purchase?.status,
      paymentId: payment?.uuid,
      cardBrand: payment?.attributes?.cardPaymentEntryMode,
      lastFour: payment?.attributes?.maskedPan?.slice(-4),
    };
  }

  throw new Error("Provider no soportado");
};

// ═════════════════════════════════════════════════════════════
//  WEBHOOK handler
// ═════════════════════════════════════════════════════════════

const webhookSchema = z.object({
  action: z.string().optional(),
  api_version: z.string().optional(),
  data: z.object({ id: z.string() }),
  date_created: z.string().optional(),
  id: z.number().optional(),
  live_mode: z.boolean().optional(),
  type: z.string().optional(),
  user_id: z.number().optional(),
});

export type WebhookPayload = z.infer<typeof webhookSchema>;

export const handleMercadoPagoWebhook = async (data: WebhookPayload) => {
  const { supabase } = await getAuthContext();
  const cfg = getServerConfig();
  if (data.type !== "payment") {
    return { received: true, processed: false, reason: "not a payment" };
  }

  const paymentId = data.data.id;
  const token = cfg.mercadopagoAccessToken;
  if (!token) throw new Error("MERCADOPAGO_ACCESS_TOKEN no configurado");

  const payment = await mpRequest(token, `/v1/payments/${paymentId}`);
  const externalRef = payment.external_reference;

  if (!externalRef) {
    return { received: true, processed: false, reason: "no external_reference" };
  }

  const { error } = await supabase
    .from("sales")
    .update({
      payment_id: paymentId,
      payment_status: payment.status,
      payment_method: payment.payment_method_id,
      payment_details: {
        status_detail: payment.status_detail,
        transaction_amount: payment.transaction_amount,
        date_approved: payment.date_approved,
        payer_email: payment.payer?.email,
      },
    })
    .eq("id", externalRef);

  if (error) {
    console.error("Error updating sale payment:", error);
    throw error;
  }

  return {
    received: true,
    processed: payment.status === "approved",
    status: payment.status,
    reference: externalRef,
  };
};
