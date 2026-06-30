// SPA-compatible config. Uses import.meta.env (Vite build-time replacement).
// All env vars must be prefixed with VITE_ to be accessible in the browser.

export function getServerConfig() {
  return {
    nodeEnv: import.meta.env.MODE,
    mercadopagoAccessToken: import.meta.env.VITE_MERCADOPAGO_ACCESS_TOKEN,
    mercadopagoWebhookSecret: import.meta.env.VITE_MERCADOPAGO_WEBHOOK_SECRET,
    zettleApiKey: import.meta.env.VITE_ZETTLE_API_KEY,
    zettleClientId: import.meta.env.VITE_ZETTLE_CLIENT_ID,
  };
}
