import { supabase } from '@/integrations/supabase/client';
import type { MonMarca } from '../types';

// Central de Monitoramento TLS — histórico unificado de alarmes
// (2026-10-17, pedido do usuário). Antes os alarmes ficavam escondidos
// dentro de `mon_leituras.alarmes` (uma leitura por ciclo de coleta, a
// cada ~20min) sem nenhuma tela que juntasse isso — essa função busca só
// as leituras que TÊM alarme (filtro no banco: `alarmes != '{}'`, não
// filtra no cliente — com coleta a cada 20min em ~318 usinas, trazer tudo
// pra filtrar depois no navegador não escala) e usa o embed automático de
// `mon_usinas` (FK já existe, `usina_id REFERENCES mon_usinas(id)`) pra
// trazer marca/modelo/cidade na mesma consulta.

export interface LeituraComAlarme {
  usina_id: string;
  coletado_em: string;
  alarmes: string[];
  mon_usinas: {
    marca: MonMarca;
    modelo: string | null;
    cidade: string | null;
    id_externo: string;
    sn_inversor: string | null;
  } | null;
}

// Um "episódio" de alarme: agrupa leituras consecutivas da mesma usina
// com o MESMO conjunto de mensagens de alarme, em vez de listar uma linha
// por ciclo de coleta (o que viraria uma lista enorme e repetitiva pra
// qualquer alarme que durasse mais de alguns minutos).
export interface EpisodioAlarme {
  usina_id: string;
  marca: MonMarca;
  modelo: string | null;
  cidade: string | null;
  id_externo: string;
  alarmes: string[];
  inicio: string;
  fim: string;
  ocorrencias: number;
}

export async function listarHistoricoAlarmes(diasAtras: number): Promise<EpisodioAlarme[]> {
  const desde = new Date(Date.now() - diasAtras * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('mon_leituras' as any)
    .select('usina_id, coletado_em, alarmes, mon_usinas(marca, modelo, cidade, id_externo, sn_inversor)')
    .not('alarmes', 'eq', '{}')
    .gte('coletado_em', desde)
    .order('coletado_em', { ascending: true })
    .limit(5000);
  if (error) throw error;

  const leituras = (data ?? []) as unknown as LeituraComAlarme[];

  // Agrupa em episódios: leituras da mesma usina, em sequência, com o
  // mesmo texto de alarme (array ordenado e comparado como string) ficam
  // juntas num só episódio (inicio = primeira, fim = última da sequência).
  const porUsina = new Map<string, LeituraComAlarme[]>();
  for (const l of leituras) {
    const lista = porUsina.get(l.usina_id) ?? [];
    lista.push(l);
    porUsina.set(l.usina_id, lista);
  }

  const episodios: EpisodioAlarme[] = [];
  for (const [usinaId, lista] of porUsina) {
    let atual: EpisodioAlarme | null = null;
    for (const l of lista) {
      const assinatura = [...l.alarmes].sort().join('|');
      if (atual && [...atual.alarmes].sort().join('|') === assinatura) {
        atual.fim = l.coletado_em;
        atual.ocorrencias += 1;
      } else {
        if (atual) episodios.push(atual);
        atual = {
          usina_id: usinaId,
          marca: l.mon_usinas?.marca ?? ('foxess' as MonMarca),
          modelo: l.mon_usinas?.modelo ?? null,
          cidade: l.mon_usinas?.cidade ?? null,
          id_externo: l.mon_usinas?.id_externo ?? '',
          alarmes: l.alarmes,
          inicio: l.coletado_em,
          fim: l.coletado_em,
          ocorrencias: 1,
        };
      }
    }
    if (atual) episodios.push(atual);
  }

  return episodios.sort((a, b) => (a.fim < b.fim ? 1 : -1));
}
