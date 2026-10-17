import { supabase } from '@/integrations/supabase/client';
import type { MonFatura } from '../types';

// Relatório de conta de luz ("Quanto sua casa consumiu?") — Fase 4,
// ferramenta de pós-venda (2026-10-17). Geração vem de mon_diario
// (somatório do período de faturamento); o resto é digitado da fatura
// física; simultaneidade/consumo real são calculados aqui e gravados
// junto (ver migração drizzle/migrations/0012_mon_faturas.sql).

export async function listarFaturasUsina(usinaId: string): Promise<MonFatura[]> {
  const { data, error } = await supabase
    .from('mon_faturas' as any)
    .select('*')
    .eq('usina_id', usinaId)
    .order('numero_conta', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as MonFatura[];
}

export async function obterFatura(faturaId: string): Promise<MonFatura | null> {
  const { data, error } = await supabase.from('mon_faturas' as any).select('*').eq('id', faturaId).maybeSingle();
  if (error) throw error;
  return (data as unknown as MonFatura) ?? null;
}

// Próximo número de conta sugerido (maior já lançado + 1, ou 1 se não
// houver nenhuma) — só uma sugestão, o campo continua editável no
// formulário pra cobrir lançamento fora de ordem.
export async function proximoNumeroConta(usinaId: string): Promise<number> {
  const { data, error } = await supabase
    .from('mon_faturas' as any)
    .select('numero_conta')
    .eq('usina_id', usinaId)
    .order('numero_conta', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  const maior = (data as unknown as { numero_conta: number } | null)?.numero_conta ?? 0;
  return maior + 1;
}

// Soma kwh de mon_diario no período de faturamento — mesma fonte usada
// em HistoricoUsina.tsx (modo "Período personalizado"), só que já volta
// pronta (um número), sem precisar carregar o histórico inteiro da
// usina pra essa tela.
export async function somarGeracaoPeriodo(usinaId: string, inicio: string, fim: string): Promise<number> {
  const { data, error } = await supabase
    .from('mon_diario' as any)
    .select('kwh')
    .eq('usina_id', usinaId)
    .gte('data', inicio)
    .lte('data', fim);
  if (error) throw error;
  return (data ?? []).reduce((acc: number, d: any) => acc + (d.kwh ?? 0), 0);
}

export interface NovaFatura {
  usina_id: string;
  cliente_base_id: string | null;
  numero_conta: number;
  periodo_inicio: string;
  periodo_fim: string;
  geracao_kwh: number;
  consumo_concessionaria_kwh: number;
  energia_injetada_kwh: number;
  saldo_mes_kwh: number;
  saldo_acumulado_kwh: number;
  criado_por: string | null;
}

export async function criarFatura(dados: NovaFatura): Promise<MonFatura> {
  // Derivados (ver comentário na migração): toda a geração do período
  // ou é consumida na hora (simultaneidade) ou é injetada na rede — não
  // tem terceira opção. E o consumo real da casa é o que ela puxou da
  // rede mais o que ela já aproveitou da própria geração.
  const consumoSimultaneidade = dados.geracao_kwh - dados.energia_injetada_kwh;
  const consumoRealCasa = consumoSimultaneidade + dados.consumo_concessionaria_kwh;

  const { data, error } = await supabase
    .from('mon_faturas' as any)
    .insert({
      ...dados,
      consumo_simultaneidade_kwh: consumoSimultaneidade,
      consumo_real_casa_kwh: consumoRealCasa,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as unknown as MonFatura;
}

export async function excluirFatura(faturaId: string): Promise<void> {
  const { error } = await supabase.from('mon_faturas' as any).delete().eq('id', faturaId);
  if (error) throw error;
}
