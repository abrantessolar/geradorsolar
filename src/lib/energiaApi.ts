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
    const ctx: any = (error as any).context;
    let msg = error.message;
    const status = ctx?.status;
    if (ctx?.body && typeof ctx.body === "object" && ctx.body.error) msg = ctx.body.error;
    try {
      if (ctx && typeof ctx.text === "function") {
        const txt = await ctx.text();
        try { const j = JSON.parse(txt); if (j.error) msg = j.error; } catch {}
      }
    } catch {}
    if (adminToken && (status === 401 || /não autorizado/i.test(msg))) {
      evClearAdminToken();
      if (typeof window !== "undefined" && !window.location.pathname.endsWith("/energia/admin/login")) {
        window.location.href = "/energia/admin/login";
      }
    }
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

export const evMaskPhone = (v: string) => {
  const d = (v || "").replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/^(\d{0,2})(\d{0,4})(\d{0,4}).*/, (_, a, b, c) =>
      [a && `(${a}`, a && a.length === 2 ? ") " : "", b, c && `-${c}`].filter(Boolean).join("")
    );
  }
  return d.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, "($1) $2-$3");
};

export const fileToBase64 = (file: File) => new Promise<string>((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => {
    const s = String(r.result || "");
    const idx = s.indexOf(",");
    resolve(idx >= 0 ? s.slice(idx + 1) : s);
  };
  r.onerror = reject;
  r.readAsDataURL(file);
});

export const evGetAdminToken = () => sessionStorage.getItem("ev_admin_token") || "";
export const evSetAdminToken = (t: string) => sessionStorage.setItem("ev_admin_token", t);
export const evClearAdminToken = () => sessionStorage.removeItem("ev_admin_token");
