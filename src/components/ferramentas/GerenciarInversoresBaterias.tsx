import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Edit2, Power, PowerOff, X, Save, Trash2, Upload, Zap, Battery, Sun } from 'lucide-react';
import {
  getInversoresHibridoDB, saveInversorHibridoDB, toggleAtivoInversorHibridoDB, deleteInversorHibridoDB,
  inversorParaForm, inversorFormVazio,
  getBateriasHibridoDB, saveBateriaHibridoDB, toggleAtivoBateriaHibridoDB, deleteBateriaHibridoDB,
  bateriaParaForm, bateriaFormVazio, uploadMiniaturaHibrido,
  type InversorForm, type BateriaForm,
} from '@/data/supabaseInversorBateria';
import {
  getPlacasKitDB, savePlacaKitDB, toggleAtivoPlacaKitDB, deletePlacaKitDB, syncKitsFromDB,
  type PlacaKitForm,
} from '@/data/supabaseStore';
import type { Kit } from '@/data/types';
import type { InversorHibrido, BateriaHibrida } from '@/data/equipamentosHibrido';
import { QUIMICAS_BATERIA, PROTOCOLOS_COMUNICACAO, TENSOES_LV } from '@/data/equipamentosHibrido';

type Aba = 'placas' | 'inversores' | 'baterias';

export default function GerenciarInversoresBaterias({ onClose, onSalvo, abaInicial = 'inversores' }: {
  onClose: () => void; onSalvo: () => void; abaInicial?: Aba;
}) {
  const [aba, setAba] = useState<Aba>(abaInicial);
  const [placas, setPlacas] = useState<Kit[]>([]);
  const [inversores, setInversores] = useState<InversorHibrido[]>([]);
  const [baterias, setBaterias] = useState<BateriaHibrida[]>([]);
  const [loading, setLoading] = useState(true);
  const [formPlaca, setFormPlaca] = useState<PlacaKitForm | null>(null);
  const [formInv, setFormInv] = useState<InversorForm | null>(null);
  const [formBat, setFormBat] = useState<BateriaForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const [pla, inv, bat] = await Promise.all([getPlacasKitDB(false), getInversoresHibridoDB(false), getBateriasHibridoDB(false)]);
      setPlacas(pla);
      setInversores(inv);
      setBaterias(bat);
    } catch (e: any) {
      toast.error('Erro ao carregar: ' + (e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const resyncKits = async () => { try { await syncKitsFromDB(); } catch {} };

  const placaFormVazio = (): PlacaKitForm => ({ line: 'excellence', brand: '', model: '', power: '', warranty: '25', costPrice: '' });
  const placaParaForm = (p: Kit): PlacaKitForm => ({
    id: p.id, line: p.line, brand: p.brand, model: p.model,
    power: String(p.power), warranty: String(p.warranty), costPrice: String(p.costPrice),
  });

  const salvarPlaca = async () => {
    if (!formPlaca) return;
    if (!formPlaca.brand.trim() || !formPlaca.model.trim() || !formPlaca.power) {
      toast.error('Preencha marca, modelo e potência.');
      return;
    }
    setSaving(true);
    try {
      await savePlacaKitDB(formPlaca);
      toast.success(formPlaca.id ? 'Placa atualizada!' : 'Placa adicionada!');
      setFormPlaca(null);
      await carregar();
      await resyncKits();
      onSalvo();
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + (e?.message || e));
    } finally { setSaving(false); }
  };

  const togglePlaca = async (p: Kit) => {
    try { await toggleAtivoPlacaKitDB(p.id, !p.active); await carregar(); await resyncKits(); onSalvo(); } catch (e: any) { toast.error('Erro: ' + (e?.message || e)); }
  };
  const excluirPlaca = async (p: Kit) => {
    if (!confirm(`Excluir "${p.brand} ${p.model}" definitivamente?\n\nAtenção: pode afetar propostas em aberto que usam essa placa.`)) return;
    try { await deletePlacaKitDB(p.id); await carregar(); await resyncKits(); onSalvo(); } catch (e: any) { toast.error('Erro: ' + (e?.message || e)); }
  };

  const handleUpload = async (file: File, prefixo: 'inversor-hibrido' | 'bateria-hibrida', aplicar: (url: string) => void) => {
    setUploading(true);
    try {
      const url = await uploadMiniaturaHibrido(file, prefixo);
      if (url) { aplicar(url); toast.success('Miniatura enviada!'); }
    } catch (e: any) {
      toast.error('Erro no upload: ' + (e?.message || e));
    } finally {
      setUploading(false);
    }
  };

  const salvarInversor = async () => {
    if (!formInv) return;
    if (!formInv.marca.trim() || !formInv.modelo.trim() || !formInv.potenciaNominalKw) {
      toast.error('Preencha marca, modelo e potência nominal.');
      return;
    }
    setSaving(true);
    try {
      await saveInversorHibridoDB(formInv);
      toast.success(formInv.id ? 'Inversor atualizado!' : 'Inversor adicionado!');
      setFormInv(null);
      await carregar();
      onSalvo();
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + (e?.message || e));
    } finally { setSaving(false); }
  };

  const salvarBateria = async () => {
    if (!formBat) return;
    if (!formBat.marca.trim() || !formBat.modelo.trim() || !formBat.capacidadeKwh) {
      toast.error('Preencha marca, modelo e capacidade.');
      return;
    }
    setSaving(true);
    try {
      await saveBateriaHibridoDB(formBat);
      toast.success(formBat.id ? 'Bateria atualizada!' : 'Bateria adicionada!');
      setFormBat(null);
      await carregar();
      onSalvo();
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + (e?.message || e));
    } finally { setSaving(false); }
  };

  const toggleInv = async (i: InversorHibrido) => {
    try { await toggleAtivoInversorHibridoDB(i.id, !i.ativo); await carregar(); onSalvo(); } catch (e: any) { toast.error('Erro: ' + (e?.message || e)); }
  };
  const excluirInv = async (i: InversorHibrido) => {
    if (!confirm(`Excluir "${i.marca} ${i.modelo}" definitivamente?`)) return;
    try { await deleteInversorHibridoDB(i.id); await carregar(); onSalvo(); } catch (e: any) { toast.error('Erro: ' + (e?.message || e)); }
  };
  const toggleBat = async (b: BateriaHibrida) => {
    try { await toggleAtivoBateriaHibridoDB(b.id, !b.ativo); await carregar(); onSalvo(); } catch (e: any) { toast.error('Erro: ' + (e?.message || e)); }
  };
  const excluirBat = async (b: BateriaHibrida) => {
    if (!confirm(`Excluir "${b.marca} ${b.modelo}" definitivamente?`)) return;
    try { await deleteBateriaHibridoDB(b.id); await carregar(); onSalvo(); } catch (e: any) { toast.error('Erro: ' + (e?.message || e)); }
  };

  const fechandoForm = () => { setFormPlaca(null); setFormInv(null); setFormBat(null); };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-xl max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-primary">Gerenciar inversores e baterias</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>

        {!formInv && !formBat && !formPlaca && (
          <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
            <button onClick={() => setAba('placas')} className={`text-sm px-3 py-1.5 rounded-md flex items-center gap-1.5 ${aba === 'placas' ? 'bg-card shadow-sm font-medium' : 'text-muted-foreground'}`}>
              <Sun className="w-3.5 h-3.5" /> Placas
            </button>
            <button onClick={() => setAba('inversores')} className={`text-sm px-3 py-1.5 rounded-md flex items-center gap-1.5 ${aba === 'inversores' ? 'bg-card shadow-sm font-medium' : 'text-muted-foreground'}`}>
              <Zap className="w-3.5 h-3.5" /> Inversores híbridos
            </button>
            <button onClick={() => setAba('baterias')} className={`text-sm px-3 py-1.5 rounded-md flex items-center gap-1.5 ${aba === 'baterias' ? 'bg-card shadow-sm font-medium' : 'text-muted-foreground'}`}>
              <Battery className="w-3.5 h-3.5" /> Baterias
            </button>
          </div>
        )}

        {/* ── LISTA / NOVO — PLACAS ── */}
        {aba === 'placas' && !formInv && !formBat && !formPlaca && (
          <>
            <p className="text-xs text-muted-foreground -mt-1">
              Este é o catálogo real de placas usado tanto nas propostas comerciais quanto no Simulador Híbrido — mudar aqui afeta os dois.
            </p>
            <button onClick={() => setFormPlaca(placaFormVazio())} className="solar-btn-primary text-sm py-2 px-4 flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Nova placa
            </button>
            {loading ? <p className="text-sm text-muted-foreground py-6 text-center">Carregando...</p> : (
              <div className="space-y-1 max-h-[50vh] overflow-y-auto">
                {placas.map(p => (
                  <div key={p.id} className={`flex items-center gap-2 py-2 border-b border-border/50 text-sm ${!p.active ? 'opacity-50' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{p.brand} {p.model}</p>
                      <p className="text-[11px] text-muted-foreground">{p.power} Wp · linha {p.line} · garantia {p.warranty} anos</p>
                    </div>
                    <button onClick={() => setFormPlaca(placaParaForm(p))} className="p-1.5 rounded text-primary hover:bg-primary/10"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => togglePlaca(p)} className={`p-1.5 rounded ${p.active ? 'text-destructive hover:bg-destructive/10' : 'text-green-700 hover:bg-green-50'}`}>
                      {p.active ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => excluirPlaca(p)} className="p-1.5 rounded text-destructive/60 hover:text-destructive hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
                {placas.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Nenhuma placa cadastrada.</p>}
              </div>
            )}
          </>
        )}

        {/* ── FORMULÁRIO PLACA ── */}
        {formPlaca && (
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">{formPlaca.id ? 'Editar placa' : 'Nova placa'}</h3>
            <div>
              <label className="block text-xs font-medium mb-1">Linha</label>
              <select className="solar-input text-sm" value={formPlaca.line} onChange={e => setFormPlaca({ ...formPlaca, line: e.target.value as any })}>
                <option value="excellence">Excellence (Inversor String)</option>
                <option value="premium">Premium (Micro Inversor)</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium mb-1">Marca</label><input className="solar-input text-sm" value={formPlaca.brand} onChange={e => setFormPlaca({ ...formPlaca, brand: e.target.value })} /></div>
              <div><label className="block text-xs font-medium mb-1">Modelo</label><input className="solar-input text-sm" value={formPlaca.model} onChange={e => setFormPlaca({ ...formPlaca, model: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block text-xs font-medium mb-1">Potência (Wp)</label><input type="text" inputMode="decimal" className="solar-input text-sm" value={formPlaca.power} onChange={e => setFormPlaca({ ...formPlaca, power: e.target.value })} /></div>
              <div><label className="block text-xs font-medium mb-1">Garantia (anos)</label><input type="text" inputMode="numeric" className="solar-input text-sm" value={formPlaca.warranty} onChange={e => setFormPlaca({ ...formPlaca, warranty: e.target.value })} /></div>
              <div><label className="block text-xs font-medium mb-1">Custo (R$)</label><input type="text" inputMode="decimal" className="solar-input text-sm" value={formPlaca.costPrice} onChange={e => setFormPlaca({ ...formPlaca, costPrice: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={fechandoForm} className="solar-btn-outline text-sm py-2 px-4" disabled={saving}>Cancelar</button>
              <button onClick={salvarPlaca} className="solar-btn-primary text-sm py-2 px-4 flex items-center gap-1.5" disabled={saving}><Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        )}

        {/* ── LISTA / NOVO — INVERSORES ── */}
        {aba === 'inversores' && !formInv && !formBat && !formPlaca && (
          <>
            <button onClick={() => setFormInv(inversorFormVazio())} className="solar-btn-primary text-sm py-2 px-4 flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Novo inversor híbrido
            </button>
            {loading ? <p className="text-sm text-muted-foreground py-6 text-center">Carregando...</p> : (
              <div className="space-y-1 max-h-[50vh] overflow-y-auto">
                {inversores.map(i => (
                  <div key={i.id} className={`flex items-center gap-2 py-2 border-b border-border/50 text-sm ${!i.ativo ? 'opacity-50' : ''}`}>
                    {i.miniaturaUrl ? <img src={i.miniaturaUrl} className="w-8 h-8 object-contain rounded border border-border" /> : <div className="w-8 h-8 rounded border border-dashed border-border" />}
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{i.marca} {i.modelo}</p>
                      <p className="text-[11px] text-muted-foreground">{i.potenciaNominalKw} kW · {i.tipoTensaoBateria === 'low_voltage' ? `LV ${i.tensaoBateriaV ?? ''}V` : 'HV'} · saída {i.tensaoSaida}</p>
                    </div>
                    <button onClick={() => setFormInv(inversorParaForm(i))} className="p-1.5 rounded text-primary hover:bg-primary/10"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => toggleInv(i)} className={`p-1.5 rounded ${i.ativo ? 'text-destructive hover:bg-destructive/10' : 'text-green-700 hover:bg-green-50'}`}>
                      {i.ativo ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => excluirInv(i)} className="p-1.5 rounded text-destructive/60 hover:text-destructive hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
                {inversores.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Nenhum inversor híbrido cadastrado.</p>}
              </div>
            )}
          </>
        )}

        {/* ── LISTA / NOVO — BATERIAS ── */}
        {aba === 'baterias' && !formInv && !formBat && (
          <>
            <button onClick={() => setFormBat(bateriaFormVazio())} className="solar-btn-primary text-sm py-2 px-4 flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Nova bateria
            </button>
            {loading ? <p className="text-sm text-muted-foreground py-6 text-center">Carregando...</p> : (
              <div className="space-y-1 max-h-[50vh] overflow-y-auto">
                {baterias.map(b => (
                  <div key={b.id} className={`flex items-center gap-2 py-2 border-b border-border/50 text-sm ${!b.ativo ? 'opacity-50' : ''}`}>
                    {b.miniaturaUrl ? <img src={b.miniaturaUrl} className="w-8 h-8 object-contain rounded border border-border" /> : <div className="w-8 h-8 rounded border border-dashed border-border" />}
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{b.marca} {b.modelo}</p>
                      <p className="text-[11px] text-muted-foreground">{b.capacidadeKwh} kWh · {b.tipoTensao === 'low_voltage' ? `LV ${b.tensaoNominalV ?? ''}V` : 'HV'} · DoD {b.dodPct}%{b.empilhavel ? ' · empilhável' : ''}</p>
                    </div>
                    <button onClick={() => setFormBat(bateriaParaForm(b))} className="p-1.5 rounded text-primary hover:bg-primary/10"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => toggleBat(b)} className={`p-1.5 rounded ${b.ativo ? 'text-destructive hover:bg-destructive/10' : 'text-green-700 hover:bg-green-50'}`}>
                      {b.ativo ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => excluirBat(b)} className="p-1.5 rounded text-destructive/60 hover:text-destructive hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
                {baterias.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Nenhuma bateria cadastrada.</p>}
              </div>
            )}
          </>
        )}

        {/* ── FORMULÁRIO INVERSOR ── */}
        {formInv && (
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">{formInv.id ? 'Editar inversor híbrido' : 'Novo inversor híbrido'}</h3>

            <div className="flex items-center gap-3">
              {formInv.miniaturaUrl ? <img src={formInv.miniaturaUrl} className="w-16 h-16 object-contain rounded border border-border" /> : <div className="w-16 h-16 rounded border border-dashed border-border flex items-center justify-center text-muted-foreground text-[10px]">sem foto</div>}
              <label className="solar-btn-outline text-xs py-1.5 px-3 cursor-pointer flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5" /> {uploading ? 'Enviando...' : 'Miniatura'}
                <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], 'inversor-hibrido', url => setFormInv(f => f && { ...f, miniaturaUrl: url }))} />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium mb-1">Marca</label><input className="solar-input text-sm" value={formInv.marca} onChange={e => setFormInv({ ...formInv, marca: e.target.value })} /></div>
              <div><label className="block text-xs font-medium mb-1">Modelo</label><input className="solar-input text-sm" value={formInv.modelo} onChange={e => setFormInv({ ...formInv, modelo: e.target.value })} /></div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div><label className="block text-xs font-medium mb-1">Potência nominal (kW)</label><input type="text" inputMode="decimal" className="solar-input text-sm" value={formInv.potenciaNominalKw} onChange={e => setFormInv({ ...formInv, potenciaNominalKw: e.target.value })} /></div>
              <div><label className="block text-xs font-medium mb-1">Potência de pico/surto (kW)</label><input type="text" inputMode="decimal" className="solar-input text-sm" value={formInv.potenciaPicoKw} onChange={e => setFormInv({ ...formInv, potenciaPicoKw: e.target.value })} /></div>
              <div><label className="block text-xs font-medium mb-1">FV máx. de entrada (kWp)</label><input type="text" inputMode="decimal" className="solar-input text-sm" value={formInv.potenciaFvMaxKwp} onChange={e => setFormInv({ ...formInv, potenciaFvMaxKwp: e.target.value })} /></div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Tensão de bateria</label>
                <select className="solar-input text-sm" value={formInv.tipoTensaoBateria} onChange={e => setFormInv({ ...formInv, tipoTensaoBateria: e.target.value as any })}>
                  <option value="low_voltage">Low Voltage (LV)</option>
                  <option value="high_voltage">High Voltage (HV)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">{formInv.tipoTensaoBateria === 'low_voltage' ? 'Tensão (V)' : 'Tensão nominal HV (V)'}</label>
                {formInv.tipoTensaoBateria === 'low_voltage' ? (
                  <select className="solar-input text-sm" value={formInv.tensaoBateriaV} onChange={e => setFormInv({ ...formInv, tensaoBateriaV: e.target.value })}>
                    {TENSOES_LV.map(v => <option key={v} value={v}>{v}V</option>)}
                  </select>
                ) : (
                  <input type="text" inputMode="decimal" className="solar-input text-sm" value={formInv.tensaoBateriaV} onChange={e => setFormInv({ ...formInv, tensaoBateriaV: e.target.value })} placeholder="Ex: 200" />
                )}
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Tensão de saída</label>
                <select className="solar-input text-sm" value={formInv.tensaoSaida} onChange={e => setFormInv({ ...formInv, tensaoSaida: e.target.value as any })}>
                  <option value="127">127V</option>
                  <option value="220">220V</option>
                  <option value="bivolt">Bivolt</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div><label className="block text-xs font-medium mb-1">Nº de MPPTs</label><input type="text" inputMode="numeric" className="solar-input text-sm" value={formInv.numMppt} onChange={e => setFormInv({ ...formInv, numMppt: e.target.value })} /></div>
              <div><label className="block text-xs font-medium mb-1">MPPT mín. (V)</label><input type="text" inputMode="decimal" className="solar-input text-sm" value={formInv.mpptTensaoMinV} onChange={e => setFormInv({ ...formInv, mpptTensaoMinV: e.target.value })} /></div>
              <div><label className="block text-xs font-medium mb-1">MPPT máx. (V)</label><input type="text" inputMode="decimal" className="solar-input text-sm" value={formInv.mpptTensaoMaxV} onChange={e => setFormInv({ ...formInv, mpptTensaoMaxV: e.target.value })} /></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium mb-1">Corrente máx. de carga da bateria (A)</label><input type="text" inputMode="decimal" className="solar-input text-sm" value={formInv.correnteMaxCargaBateriaA} onChange={e => setFormInv({ ...formInv, correnteMaxCargaBateriaA: e.target.value })} /></div>
              <div>
                <label className="block text-xs font-medium mb-1">Protocolo de comunicação c/ bateria</label>
                <input list="protocolos-com" className="solar-input text-sm" value={formInv.protocoloComunicacao} onChange={e => setFormInv({ ...formInv, protocoloComunicacao: e.target.value })} />
                <datalist id="protocolos-com">{PROTOCOLOS_COMUNICACAO.map(p => <option key={p} value={p} />)}</datalist>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Baterias homologadas/compatíveis (texto livre)</label>
              <input className="solar-input text-sm" value={formInv.bateriasCompativeis} onChange={e => setFormInv({ ...formInv, bateriasCompativeis: e.target.value })} placeholder="Ex: Pylontech US series, Deye BOS-G" />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Garantia (anos)</label>
              <input type="text" inputMode="numeric" className="solar-input text-sm w-32" value={formInv.garantiaAnos} onChange={e => setFormInv({ ...formInv, garantiaAnos: e.target.value })} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={fechandoForm} className="solar-btn-outline text-sm py-2 px-4" disabled={saving}>Cancelar</button>
              <button onClick={salvarInversor} className="solar-btn-primary text-sm py-2 px-4 flex items-center gap-1.5" disabled={saving}><Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        )}

        {/* ── FORMULÁRIO BATERIA ── */}
        {formBat && (
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">{formBat.id ? 'Editar bateria' : 'Nova bateria'}</h3>

            <div className="flex items-center gap-3">
              {formBat.miniaturaUrl ? <img src={formBat.miniaturaUrl} className="w-16 h-16 object-contain rounded border border-border" /> : <div className="w-16 h-16 rounded border border-dashed border-border flex items-center justify-center text-muted-foreground text-[10px]">sem foto</div>}
              <label className="solar-btn-outline text-xs py-1.5 px-3 cursor-pointer flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5" /> {uploading ? 'Enviando...' : 'Miniatura'}
                <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], 'bateria-hibrida', url => setFormBat(f => f && { ...f, miniaturaUrl: url }))} />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium mb-1">Marca</label><input className="solar-input text-sm" value={formBat.marca} onChange={e => setFormBat({ ...formBat, marca: e.target.value })} /></div>
              <div><label className="block text-xs font-medium mb-1">Modelo</label><input className="solar-input text-sm" value={formBat.modelo} onChange={e => setFormBat({ ...formBat, modelo: e.target.value })} /></div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div><label className="block text-xs font-medium mb-1">Capacidade nominal (kWh)</label><input type="text" inputMode="decimal" className="solar-input text-sm" value={formBat.capacidadeKwh} onChange={e => setFormBat({ ...formBat, capacidadeKwh: e.target.value })} /></div>
              <div>
                <label className="block text-xs font-medium mb-1">Tensão</label>
                <select className="solar-input text-sm" value={formBat.tipoTensao} onChange={e => setFormBat({ ...formBat, tipoTensao: e.target.value as any })}>
                  <option value="low_voltage">Low Voltage (LV)</option>
                  <option value="high_voltage">High Voltage (HV)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">{formBat.tipoTensao === 'low_voltage' ? 'Tensão (V)' : 'Tensão nominal HV (V)'}</label>
                {formBat.tipoTensao === 'low_voltage' ? (
                  <select className="solar-input text-sm" value={formBat.tensaoNominalV} onChange={e => setFormBat({ ...formBat, tensaoNominalV: e.target.value })}>
                    {TENSOES_LV.map(v => <option key={v} value={v}>{v}V</option>)}
                  </select>
                ) : (
                  <input type="text" inputMode="decimal" className="solar-input text-sm" value={formBat.tensaoNominalV} onChange={e => setFormBat({ ...formBat, tensaoNominalV: e.target.value })} placeholder="Ex: 200" />
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div><label className="block text-xs font-medium mb-1">Descarga contínua máx. (A)</label><input type="text" inputMode="decimal" className="solar-input text-sm" value={formBat.correnteMaxDescargaContinuaA} onChange={e => setFormBat({ ...formBat, correnteMaxDescargaContinuaA: e.target.value })} /></div>
              <div><label className="block text-xs font-medium mb-1">Descarga de pico máx. (A)</label><input type="text" inputMode="decimal" className="solar-input text-sm" value={formBat.correnteMaxDescargaPicoA} onChange={e => setFormBat({ ...formBat, correnteMaxDescargaPicoA: e.target.value })} /></div>
              <div><label className="block text-xs font-medium mb-1">DoD — profundidade de descarga (%)</label><input type="text" inputMode="decimal" className="solar-input text-sm" value={formBat.dodPct} onChange={e => setFormBat({ ...formBat, dodPct: e.target.value })} /></div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Química</label>
                <input list="quimicas-bat" className="solar-input text-sm" value={formBat.quimica} onChange={e => setFormBat({ ...formBat, quimica: e.target.value })} />
                <datalist id="quimicas-bat">{QUIMICAS_BATERIA.map(q => <option key={q} value={q} />)}</datalist>
              </div>
              <div><label className="block text-xs font-medium mb-1">Ciclos de vida</label><input type="text" inputMode="numeric" className="solar-input text-sm" value={formBat.ciclosVida} onChange={e => setFormBat({ ...formBat, ciclosVida: e.target.value })} /></div>
              <div><label className="block text-xs font-medium mb-1">Máx. unidades em paralelo</label><input type="text" inputMode="numeric" className="solar-input text-sm" value={formBat.maxUnidadesParalelo} onChange={e => setFormBat({ ...formBat, maxUnidadesParalelo: e.target.value })} disabled={!formBat.empilhavel} /></div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Garantia (anos)</label>
              <input type="text" inputMode="numeric" className="solar-input text-sm w-32" value={formBat.garantiaAnos} onChange={e => setFormBat({ ...formBat, garantiaAnos: e.target.value })} />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={formBat.empilhavel} onChange={e => setFormBat({ ...formBat, empilhavel: e.target.checked })} className="accent-primary" />
              Empilhável (dá pra somar mais de uma unidade)
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={fechandoForm} className="solar-btn-outline text-sm py-2 px-4" disabled={saving}>Cancelar</button>
              <button onClick={salvarBateria} className="solar-btn-primary text-sm py-2 px-4 flex items-center gap-1.5" disabled={saving}><Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
