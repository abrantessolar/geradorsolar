import { supabase } from "@/integrations/supabase/client";

const FN = "energia";

export async function evCall<T = any>(action: string, payload: Record<string, any> = {}, adminToken?: string): Promise<T> {
  const headers: Record<string, string> = {};
  if (adminToken) headers["x-ev-admin-token"] = adminToken;
  const { data, error } = await supabase.functions.invoke(FN, {
    body: { action, ...payload },
    headers,
  });
  if (error) {
    // edge fn returns a Response with status ≠ 2xx — extract JSON message
    const ctx: any = (error as any).context;
    let msg = error.message;
    if (ctx?.body && typeof ctx.body === "object" && ctx.body.error) msg = ctx.body.error;
    try {
      if (ctx && typeof ctx.text === "function") {
        const txt = await ctx.text();
        try { const j = JSON.parse(txt); if (j.error) msg = j.error; } catch {}
      }
    } catch {}
    throw new Error(msg);
  }
  if (data && (data as any).error) throw new Error((data as any).error);
  return data as T;
}

export const evMaskCpf = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
};

export const evGetAdminToken = () => sessionStorage.getItem("ev_admin_token") || "";
export const evSetAdminToken = (t: string) => sessionStorage.setItem("ev_admin_token", t);
export const evClearAdminToken = () => sessionStorage.removeItem("ev_admin_token");
