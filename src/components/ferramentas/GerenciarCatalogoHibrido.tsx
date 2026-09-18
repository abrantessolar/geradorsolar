import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Edit2, Power, PowerOff, X, Save, Trash2 } from 'lucide-react';
import type { Janela } from '@/data/catalogoSimuladorHibrido';
import {
  getEquipamentosHibridoDB, saveEquipamentoHibridoDB, toggleAtivoEquipamentoHibridoDB,
  deleteEquipamentoHibridoDB, rowParaForm, formVazio,
  type EquipamentoHibridoRow, type EquipamentoHibridoForm,
} from '@/data/supabaseEquipamentosHibrido';

/** Expande [inicio,fim) (fim pode passar de 23 pra indicar virada de dia) num conjunto de horas 0-23. */
function janelaParaHoras(janela: Janela): Set<number> {
  const horas = new Set<number>();
  janela.forEach(([ini, fim]) => {
    for (let h = ini; h < fim; h++) horas.add(((h % 24) + 24) % 24);
  });
  return horas;
}

/** Junta um conjunto de horas marcadas em faixas contínuas [inicio,fim), preservando virada de meia-noite. */
function horasParaJanela(horasSet: Set<number>): Janela {
  if (horasSet.size === 0) return [];
  if (horasSet.size === 24) return [[0, 24]];
  let gap = 0;
  for (let h = 0; h < 24; h++) { if (!horasSet.has(h)) { gap = h; break; } }
  const janela: Janela = [];
  let inicioAtual: number | null = null;
  for (let passo = 0; passo <= 24; passo++) {
    const h = gap + passo;
    const marcado = passo < 24 && horasSet.has(h % 24);
    if (marcado && inicioAtual === null) inicioAtual = h;
    if (!marcado && inicioAtual !== null) { janela.push([inicioAtual, h]); inicioAtual = null; }
  }
  return janela;
}


export default function GerenciarCatalogoHibrido({ onClose, onSalvo }: { onClose: () => void; onSalvo: () => void }) {
  const [rows, setRows] = useState<EquipamentoHibridoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<EquipamentoHibridoForm | null>(null);
  const [saving, setSaving] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const data = await getEquipamentosHibridoDB(false); // inclui inativos aqui
      setRows(data);
    } catch (e: any) {
      toast.error('Erro ao carregar catálogo: ' + (e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const categoriasExistentes = Array.from(new Set(rows.map(r => r.categoria))).sort();

  const salvar = async () => {
    if (!form) return;
    if (!form.categoria.trim() || !form.nome.trim() || !form.potenciaKw) {
      toast.error('Preencha categoria, nome e potência.');
      return;
    }
    setSaving(true);
    try {
      await saveEquipamentoHibridoDB(form);
      toast.success(form.id ? 'Equipamento atualizado!' : 'Equipamento adicionado!');
      setForm(null);
      await carregar();
      onSalvo();
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + (e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  const toggleAtivo = async (r: EquipamentoHibridoRow) => {
    try {
      await toggleAtivoEquipamentoHibridoDB(r.id, !r.ativo);
      toast.success(r.ativo ? 'Desativado' : 'Reativado');
      await carregar();
      onSalvo();
    } catch (e: any) {
      toast.error('Erro: ' + (e?.message || e));
    }
  };

  const excluir = async (r: EquipamentoHibridoRow) => {
    if (!confirm(`Excluir "${r.nome}" definitivamente? Prefira "Desativar" se não tiver certeza.`)) return;
    try {
      await deleteEquipamentoHibridoDB(r.id);
      toast.success('Excluído.');
      await carregar();
      onSalvo();
    } catch (e: any) {
      toast.error('Erro: ' + (e?.message || e));
    }
  };

  const toggleHora = (h: number) => {
    if (!form) return;
    const horas = janelaParaHoras(form.janela);
    if (horas.has(h)) horas.delete(h); else horas.add(h);
    setForm({ ...form, janela: horasParaJanela(horas) });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-xl max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-primary">Gerenciar catálogo de equipamentos</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>

        {!form && (
          <>
            <button onClick={() => setForm(formVazio())} className="solar-btn-primary text-sm py-2 px-4 flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Novo equipamento
            </button>

            {loading ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Carregando...</p>
            ) : (
              <div className="space-y-1 max-h-[50vh] overflow-y-auto">
                {categoriasExistentes.map(cat => (
                  <div key={cat}>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mt-3 mb-1">{cat}</p>
                    {rows.filter(r => r.categoria === cat).map(r => (
                      <div key={r.id} className={`flex items-center gap-2 py-1.5 border-b border-border/50 text-sm ${!r.ativo ? 'opacity-50' : ''}`}>
                        <span className="flex-1 truncate">{r.nome}</span>
                        <span className="text-xs text-muted-foreground w-24 text-right">
                          {r.potencia_kw} kW{r.potencia_pico_kw != null && <span className="text-amber-600 dark:text-amber-400"> ⚡{r.potencia_pico_kw}</span>}
                        </span>
                        <button onClick={() => setForm(rowParaForm(r))} className="p-1.5 rounded text-primary hover:bg-primary/10" title="Editar">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => toggleAtivo(r)} className={`p-1.5 rounded ${r.ativo ? 'text-destructive hover:bg-destructive/10' : 'text-green-700 hover:bg-green-50'}`} title={r.ativo ? 'Desativar' : 'Reativar'}>
                          {r.ativo ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => excluir(r)} className="p-1.5 rounded text-destructive/60 hover:text-destructive hover:bg-destructive/10" title="Excluir definitivamente">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {form && (
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">{form.id ? 'Editar equipamento' : 'Novo equipamento'}</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Categoria</label>
                <input list="categorias-hibrido" className="solar-input text-sm" value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} placeholder="Ex: Cozinha" />
                <datalist id="categorias-hibrido">
                  {categoriasExistentes.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Nome</label>
                <input className="solar-input text-sm" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Micro-ondas" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Potência (kW)</label>
                <input type="text" inputMode="decimal" className="solar-input text-sm" value={form.potenciaKw} onChange={e => setForm({ ...form, potenciaKw: e.target.value })} placeholder="Ex: 1.2" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Tipo de cálculo</label>
                <select className="solar-input text-sm" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value as any })}>
                  <option value="fixo">Fixo (fator de serviço)</option>
                  <option value="tempo_ajustavel">Tempo ajustável (cliente edita)</option>
                </select>
              </div>
            </div>

            {form.tipo === 'fixo' ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Fator de serviço (0 a 1)</label>
                  <input type="text" inputMode="decimal" className="solar-input text-sm" value={form.fatorServico} onChange={e => setForm({ ...form, fatorServico: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Horas de uso/dia</label>
                  <input type="text" inputMode="decimal" className="solar-input text-sm" value={form.horasDia} onChange={e => setForm({ ...form, horasDia: e.target.value })} />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Unidade do tempo</label>
                  <select className="solar-input text-sm" value={form.unidadeTempo} onChange={e => setForm({ ...form, unidadeTempo: e.target.value as any })}>
                    <option value="h">Horas</option>
                    <option value="min">Minutos</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Tempo padrão sugerido</label>
                  <input type="text" inputMode="decimal" className="solar-input text-sm" value={form.tempoPadrao} onChange={e => setForm({ ...form, tempoPadrao: e.target.value })} />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium mb-1">Km/dia padrão (só pra Veículo Elétrico — deixe em branco pros demais)</label>
              <input type="text" inputMode="decimal" className="solar-input text-sm" value={form.kmDia} onChange={e => setForm({ ...form, kmDia: e.target.value })} />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Potência de pico/partida (kW) — só se souber o dado real (placa do motor/compressor)</label>
              <input type="text" inputMode="decimal" className="solar-input text-sm" value={form.potenciaPicoKw} onChange={e => setForm({ ...form, potenciaPicoKw: e.target.value })} placeholder="Deixe em branco = sem surto conhecido" />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5">
                Janela de uso (clique nas horas em que o equipamento fica ligado)
              </label>
              <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5">
                {Array.from({ length: 24 }, (_, h) => h).map(h => {
                  const marcado = janelaParaHoras(form.janela).has(h);
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => toggleHora(h)}
                      className={`text-xs py-1.5 rounded-md border transition-colors ${
                        marcado
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-muted-foreground border-input hover:bg-muted'
                      }`}
                    >
                      {String(h).padStart(2, '0')}h
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">
                {form.janela.length === 0 ? 'Nenhum horário marcado.' : `${janelaParaHoras(form.janela).size} hora(s) marcada(s).`} Faixas que passam da meia-noite (ex: 22h às 02h) são detectadas automaticamente.
              </p>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.selecionadoPadrao} onChange={e => setForm({ ...form, selecionadoPadrao: e.target.checked })} className="accent-primary" />
              Marcado por padrão ao abrir a ferramenta
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setForm(null)} className="solar-btn-outline text-sm py-2 px-4" disabled={saving}>Cancelar</button>
              <button onClick={salvar} className="solar-btn-primary text-sm py-2 px-4 flex items-center gap-1.5" disabled={saving}>
                <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
