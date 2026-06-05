import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, AlertTriangle, HardHat, Link2 } from 'lucide-react';
import { KANBAN_COLUNAS, FLUXOS, colunaAtual, defaultEtapasSeed, type RastreamentoRow } from '@/lib/rastreamentoEtapas';
import { getConfigDB } from '@/data/supabaseStore';
import RastreamentoPainel from './RastreamentoPainel';

interface ProjetoKanban {
  id: string;
  nome: string;
  telefone: string | null;
  instalador: string | null;
  codigo_rastreamento: string | null;
  numero_proposta: string | null;
  criado_em: string;
}

function daysSince(dateStr?: string | null): number {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

export default function KanbanAcompanhamento() {
  const [projetos, setProjetos] = useState<ProjetoKanban[]>([]);
  const [rowsByProjeto, setRowsByProjeto] = useState<Record<string, RastreamentoRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [prazoDias, setPrazoDias] = useState(7);
  const [painelProjeto, setPainelProjeto] = useState<ProjetoKanban | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: projs } = await supabase
      .from('projetos' as any)
      .select('id, nome_completo, razao_social, telefone, instalador, codigo_rastreamento, proposta_id, criado_em')
      .order('criado_em', { ascending: false });

    const propIds = (projs || []).map((p: any) => p.proposta_id).filter(Boolean);
    let numeros: Record<string, string> = {};
    if (propIds.length) {
      const { data: props } = await supabase.from('propostas' as any).select('id, numero_proposta').in('id', propIds);
      for (const pr of props || []) numeros[(pr as any).id] = (pr as any).numero_proposta;
    }

    const list: ProjetoKanban[] = (projs || []).map((p: any) => ({
      id: p.id,
      nome: p.nome_completo || p.razao_social || '—',
      telefone: p.telefone || null,
      instalador: p.instalador || null,
      codigo_rastreamento: p.codigo_rastreamento || null,
      numero_proposta: p.proposta_id ? (numeros[p.proposta_id] || null) : null,
      criado_em: p.criado_em,
    }));

    const { data: allRows } = await supabase.from('rastreamento_obras' as any).select('*');
    const byProj: Record<string, RastreamentoRow[]> = {};
    for (const r of (allRows || []) as any[]) {
      (byProj[r.projeto_id] ||= []).push(r);
    }

    const cfg = await getConfigDB('rastreamento_prazo_dias');
    if (cfg) setPrazoDias(Number(cfg) || 7);

    setProjetos(list);
    setRowsByProjeto(byProj);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const colunas = useMemo(() => {
    const map: Record<string, ProjetoKanban[]> = { homologacao: [], equipamentos: [], instalacao: [], concluido: [] };
    for (const p of projetos) {
      const rows = rowsByProjeto[p.id] || [];
      const col = rows.length ? colunaAtual(rows) : 'homologacao';
      map[col].push(p);
    }
    return map;
  }, [projetos, rowsByProjeto]);

  const diasNaEtapa = (p: ProjetoKanban) => {
    const rows = rowsByProjeto[p.id] || [];
    const datas = rows.filter(r => r.concluido && r.data_conclusao).map(r => r.data_conclusao!);
    const ref = datas.length ? datas.sort().slice(-1)[0] : p.criado_em;
    return daysSince(ref);
  };

  const setStage = async (projetoId: string, coluna: string) => {
    // garante seed
    let rows = rowsByProjeto[projetoId] || [];
    if (rows.length === 0) {
      await supabase.from('rastreamento_obras' as any).insert(defaultEtapasSeed(projetoId));
      const res = await supabase.from('rastreamento_obras' as any).select('*').eq('projeto_id', projetoId);
      rows = (res.data || []) as any;
    }

    const order = ['homologacao', 'equipamentos', 'instalacao', 'concluido'];
    const targetIdx = order.indexOf(coluna);
    const now = new Date().toISOString();

    // Define o estado concluído de cada (fluxo, etapa) com base no estágio alvo
    const shouldComplete = (fluxo: number, etapa: number, isLast: boolean): boolean | null => {
      // homologação = fluxo 1, equipamentos = fluxo 2, instalação = fluxo 3
      if (fluxo === 1) {
        if (targetIdx >= 1) return etapa <= 3 ? true : null; // concluído a partir de equipamentos
        return false; // em homologação: tudo pendente
      }
      if (fluxo === 2) {
        if (targetIdx >= 2) return true; // concluído a partir de instalação
        if (targetIdx === 1) return false; // em equipamentos: pendente
        return false;
      }
      if (fluxo === 3) {
        if (targetIdx === 3) return true; // concluído: tudo
        return false; // ainda não em operação
      }
      return null;
    };

    const updates = rows.filter(r => !(r.fluxo === 1 && r.etapa === 4)).map(r => {
      const def = FLUXOS.find(f => f.fluxo === r.fluxo)!;
      const isLast = r.etapa === def.etapas.length;
      const target = shouldComplete(r.fluxo, r.etapa, isLast);
      if (target === null || target === r.concluido) return null;
      return { id: r.id, concluido: target, data_conclusao: target ? (r.data_conclusao || now) : null };
    }).filter(Boolean) as any[];

    for (const u of updates) {
      await supabase.from('rastreamento_obras' as any).update({ concluido: u.concluido, data_conclusao: u.data_conclusao }).eq('id', u.id);
    }
    toast.success('Etapa atualizada');
    load();
  };

  const onDrop = (coluna: string) => {
    if (dragId) setStage(dragId, coluna);
    setDragId(null);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Arraste os cards entre as colunas para atualizar o estágio. Clique em um card para gerenciar as etapas detalhadas.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {KANBAN_COLUNAS.map(col => (
          <div
            key={col.key}
            onDragOver={e => e.preventDefault()}
            onDrop={() => onDrop(col.key)}
            className="rounded-xl bg-muted/40 border border-border min-h-[200px]"
          >
            <div className="px-3 py-2 border-b border-border flex items-center justify-between sticky top-0 bg-muted/40 rounded-t-xl">
              <h3 className="text-sm font-semibold text-foreground">{col.titulo}</h3>
              <span className="text-xs text-muted-foreground bg-background rounded-full px-2 py-0.5">{colunas[col.key].length}</span>
            </div>
            <div className="p-2 space-y-2">
              {colunas[col.key].map(p => {
                const dias = diasNaEtapa(p);
                const atrasado = col.key !== 'concluido' && dias > prazoDias;
                return (
                  <div
                    key={p.id}
                    draggable
                    onDragStart={() => setDragId(p.id)}
                    onClick={() => setPainelProjeto(p)}
                    className={`bg-card rounded-lg border p-3 cursor-pointer hover:shadow-md transition-shadow space-y-1.5 ${atrasado ? 'border-destructive/50' : 'border-border'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm text-foreground leading-tight">{p.nome}</p>
                      {p.codigo_rastreamento && <Link2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />}
                    </div>
                    {p.numero_proposta && <p className="text-[11px] text-muted-foreground">{p.numero_proposta}</p>}
                    {p.instalador && (
                      <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300">
                        <HardHat className="w-3 h-3" /> {p.instalador}
                      </span>
                    )}
                    <div className="flex items-center justify-between pt-0.5">
                      <span className={`text-[11px] ${atrasado ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>{dias}d nesta etapa</span>
                      {atrasado && <AlertTriangle className="w-3.5 h-3.5 text-destructive" />}
                    </div>
                  </div>
                );
              })}
              {colunas[col.key].length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Vazio</p>}
            </div>
          </div>
        ))}
      </div>

      {painelProjeto && (
        <RastreamentoPainel projeto={painelProjeto} onClose={() => setPainelProjeto(null)} onChanged={load} />
      )}
    </div>
  );
}
