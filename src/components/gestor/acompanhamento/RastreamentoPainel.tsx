import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { X, Check, Clock, Eye, EyeOff, MessageCircle, Loader2 } from 'lucide-react';
import { FLUXOS, defaultEtapasSeed, type RastreamentoRow } from '@/lib/rastreamentoEtapas';

interface ProjetoLite {
  id: string;
  nome: string;
  telefone?: string | null;
  codigo_rastreamento?: string | null;
}

const BASE_URL = 'https://treslagoassolar.com.br';

export default function RastreamentoPainel({ projeto, onClose, onChanged }: {
  projeto: ProjetoLite;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [rows, setRows] = useState<RastreamentoRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    let { data } = await supabase
      .from('rastreamento_obras' as any)
      .select('*')
      .eq('projeto_id', projeto.id)
      .order('fluxo').order('etapa');
    if (!data || data.length === 0) {
      // seed
      await supabase.from('rastreamento_obras' as any).insert(defaultEtapasSeed(projeto.id));
      const res = await supabase.from('rastreamento_obras' as any).select('*').eq('projeto_id', projeto.id).order('fluxo').order('etapa');
      data = res.data;
    }
    setRows((data || []) as any);
    setLoading(false);
  }, [projeto.id]);

  useEffect(() => { load(); }, [load]);

  const getRow = (fluxo: number, etapa: number) => rows.find(r => r.fluxo === fluxo && r.etapa === etapa);

  const patchRow = async (fluxo: number, etapa: number, patch: Partial<RastreamentoRow>, extra?: Record<string, any>) => {
    const existing = getRow(fluxo, etapa);
    let merged = patch;
    if (extra) {
      const ce = { ...(existing?.campo_extra || {}), ...extra };
      merged = { ...patch, campo_extra: ce };
    }
    if (existing) {
      const { error } = await supabase.from('rastreamento_obras' as any).update(merged).eq('id', existing.id);
      if (error) { toast.error(error.message); return; }
      setRows(prev => prev.map(r => r.id === existing.id ? { ...r, ...merged } as any : r));
    } else {
      const { data, error } = await supabase.from('rastreamento_obras' as any)
        .insert({ projeto_id: projeto.id, fluxo, etapa, concluido: false, visivel_cliente: true, ...merged })
        .select().single();
      if (error) { toast.error(error.message); return; }
      setRows(prev => [...prev, data as any]);
    }
    onChanged();
  };

  const toggleConcluido = async (fluxo: number, etapa: number, titulo: string, visivel: boolean) => {
    const row = getRow(fluxo, etapa);
    const novoConcluido = !row?.concluido;
    await patchRow(fluxo, etapa, {
      concluido: novoConcluido,
      data_conclusao: novoConcluido ? new Date().toISOString() : null,
    });
    if (novoConcluido && visivel && projeto.telefone) {
      askNotify(titulo);
    }
  };

  const askNotify = (titulo: string) => {
    if (!projeto.codigo_rastreamento) return;
    if (window.confirm(`Etapa "${titulo}" concluída.\n\nDeseja notificar o cliente via WhatsApp sobre essa atualização?`)) {
      const link = `${BASE_URL}/acompanhar/${projeto.codigo_rastreamento}`;
      const msg = `Olá ${projeto.nome}! Temos uma atualização no seu projeto solar. 🌞\n\n${titulo} foi concluído!\n\nAcompanhe todos os detalhes em:\n${link}`;
      const phone = (projeto.telefone || '').replace(/\D/g, '');
      const wa = phone ? `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
      window.open(wa, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative w-full max-w-md bg-background h-full overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-background border-b border-border px-4 py-3 flex items-center justify-between z-10">
          <div className="min-w-0">
            <h2 className="font-bold text-foreground truncate">{projeto.nome}</h2>
            <p className="text-xs text-muted-foreground">Etapas do rastreamento</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <div className="p-4 space-y-5">
            {FLUXOS.map(f => (
              <div key={f.fluxo} className="rounded-xl border border-border">
                <div className="px-3 py-2 border-b border-border bg-muted/40 flex items-center gap-2">
                  <span className="text-lg">{f.icone}</span>
                  <h3 className="font-semibold text-sm text-foreground">{f.titulo}</h3>
                </div>
                <div className="divide-y divide-border">
                  {f.etapas.map(e => {
                    const row = getRow(f.fluxo, e.etapa);
                    const concluido = !!row?.concluido;
                    const visivel = row ? row.visivel_cliente : true;
                    const ce = row?.campo_extra || {};
                    // etapa condicional: mostra toggle de ativação
                    const condicionalAtiva = e.condicional ? !!ce.ativada : true;
                    return (
                      <div key={e.etapa} className="p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-foreground flex-1">
                            {e.titulo}
                            {e.condicional && <span className="ml-1 text-[10px] text-muted-foreground">(condicional)</span>}
                          </span>
                          {e.condicional && (
                            <button
                              onClick={() => patchRow(f.fluxo, e.etapa, {}, { ativada: !ce.ativada })}
                              className={`text-[10px] px-2 py-0.5 rounded-full ${ce.ativada ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}
                            >
                              {ce.ativada ? 'Ativada' : 'Ativar'}
                            </button>
                          )}
                        </div>

                        {condicionalAtiva && (
                          <>
                            <div className="flex gap-2">
                              <button
                                onClick={() => toggleConcluido(f.fluxo, e.etapa, e.titulo, visivel)}
                                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg ${concluido ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
                              >
                                {concluido ? <Check className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                                {concluido ? 'Concluído' : 'Pendente'}
                              </button>
                              <button
                                onClick={() => patchRow(f.fluxo, e.etapa, { visivel_cliente: !visivel })}
                                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg ${visivel ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' : 'bg-muted text-muted-foreground'}`}
                              >
                                {visivel ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                {visivel ? 'Visível' : 'Oculto'}
                              </button>
                            </div>

                            {/* Campos especiais */}
                            {f.fluxo === 2 && e.etapa === 4 && (
                              <div className="flex gap-3 text-xs pt-1">
                                {[['empresa', 'Na empresa TLS'], ['cliente', 'No cliente']].map(([val, label]) => (
                                  <label key={val} className="flex items-center gap-1 cursor-pointer">
                                    <input type="radio" name={`local-${row?.id || e.etapa}`} checked={ce.local_entrega === val}
                                      onChange={() => patchRow(f.fluxo, e.etapa, {}, { local_entrega: val })} className="accent-primary" />
                                    {label}
                                  </label>
                                ))}
                              </div>
                            )}
                            {f.fluxo === 3 && e.etapa === 1 && (
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-muted-foreground">Nº na fila:</span>
                                <input type="number" className="solar-input py-1 w-20 text-xs" value={ce.numero_fila ?? ''}
                                  onChange={ev => patchRow(f.fluxo, e.etapa, {}, { numero_fila: ev.target.value ? Number(ev.target.value) : null })} />
                              </div>
                            )}
                            {f.fluxo === 3 && e.etapa === 2 && (
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-muted-foreground">Agendada para:</span>
                                <input type="date" className="solar-input py-1 text-xs" value={ce.data_agendamento ?? ''}
                                  onChange={ev => patchRow(f.fluxo, e.etapa, {}, { data_agendamento: ev.target.value || null })} />
                              </div>
                            )}
                            {f.fluxo === 3 && e.etapa === 4 && (
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-muted-foreground">Operação em:</span>
                                <input type="date" className="solar-input py-1 text-xs" value={ce.data_operacao ?? ''}
                                  onChange={ev => patchRow(f.fluxo, e.etapa, {}, { data_operacao: ev.target.value || null })} />
                              </div>
                            )}

                            <textarea
                              className="solar-input text-xs min-h-[44px]"
                              placeholder="Observação interna (nunca aparece ao cliente)"
                              defaultValue={row?.observacao_interna || ''}
                              onBlur={ev => {
                                if (ev.target.value !== (row?.observacao_interna || '')) {
                                  patchRow(f.fluxo, e.etapa, { observacao_interna: ev.target.value || null });
                                }
                              }}
                            />
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
