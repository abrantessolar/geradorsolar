// track(event, params) — único ponto de saída de analytics da Central.
// Empurra para window.dataLayer (GTM/GA4) quando existir; sem bloquear nada
// se não existir. NUNCA inclui nome, telefone ou outros dados pessoais —
// isso é responsabilidade de quem chama (ver regra na seção 33 da spec).
export type CentralEventName =
  | 'central_started'
  | 'entry_customer'
  | 'entry_quote'
  | 'entry_external_system'
  | 'entry_supplier'
  | 'help_now_clicked'
  | 'need_selected'
  | 'consumption_selected'
  | 'priority_selected'
  | 'excitement_1'
  | 'excitement_3'
  | 'excitement_6'
  | 'excitement_9'
  | 'excitement_10'
  | 'video_started'
  | 'video_25'
  | 'video_50'
  | 'video_75'
  | 'video_completed'
  | 'video_skipped'
  | 'file_upload_started'
  | 'file_upload_completed'
  | 'lead_started'
  | 'lead_completed'
  | 'route_commercial'
  | 'route_customer_support'
  | 'route_external_support'
  | 'route_supplier'
  | 'whatsapp_clicked'
  | 'funnel_completed'
  | 'funnel_abandoned';

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

const PII_KEYS = ['nome', 'name', 'telefone', 'whatsapp', 'phone', 'email'];

function stripPII<T extends Record<string, unknown>>(params: T): T {
  const safe = { ...params } as Record<string, unknown>;
  for (const key of Object.keys(safe)) {
    if (PII_KEYS.includes(key.toLowerCase())) delete safe[key];
  }
  return safe as T;
}

export function track(event: CentralEventName, params: Record<string, unknown> = {}): void {
  try {
    const payload = { event, ...stripPII(params) };
    if (typeof window !== 'undefined') {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(payload);
    }
  } catch {
    // Analytics nunca deve quebrar a experiência do usuário.
  }
}
