import { ConfigAntecipacao, CONFIG_PADRAO, FaixaTaxa } from "./receivablesCalc";

const STORAGE_KEY = "tls_antecipacao_config";

export function getReceivablesConfig(): ConfigAntecipacao {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...CONFIG_PADRAO };
    const parsed = JSON.parse(raw);
    // Mescla com o padrão para preencher campos novos sem perder o que já foi salvo.
    return {
      ...CONFIG_PADRAO,
      ...parsed,
      tabelaTaxas: Array.isArray(parsed.tabelaTaxas) && parsed.tabelaTaxas.length > 0 ? parsed.tabelaTaxas : CONFIG_PADRAO.tabelaTaxas,
      feriadosCustom: Array.isArray(parsed.feriadosCustom) ? parsed.feriadosCustom : [],
    };
  } catch {
    return { ...CONFIG_PADRAO };
  }
}

export function saveReceivablesConfig(config: ConfigAntecipacao) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function updateFaixaTaxa(tabela: FaixaTaxa[], index: number, patch: Partial<FaixaTaxa>): FaixaTaxa[] {
  return tabela.map((f, i) => (i === index ? { ...f, ...patch } : f));
}
