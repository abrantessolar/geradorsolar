import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Battery, Plus, Minus, ChevronDown, AlertTriangle, Settings2, Loader2 } from 'lucide-react';
import {
  ComposedChart, Area, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  CATALOGO_HIBRIDO as CATALOGO_FALLBACK, SELECIONADOS_PADRAO as SELECIONADOS_FALLBACK,
  GERACAO_DIARIA_TOTAL, NOME_DIA, ORDEM_DIAS, type ItemCatalogo, type CategoriaCatalogo,
} from '@/data/catalogoSimuladorHibrido';
import { calcularSimulacaoHibrida, type ConfigItem, type ItemSelecionado } from '@/lib/simuladorHibrido';
import { getEquipamentosHibridoDB, agruparPorCategoria } from '@/data/supabaseEquipamentosHibrido';
import { getInversoresHibridoDB, getBateriasHibridoDB } from '@/data/supabaseInversorBateria';
import type { InversorHibrido, BateriaHibrida } from '@/data/equipamentosHibrido';
import GerenciarCatalogoHibrido from '@/components/ferramentas/GerenciarCatalogoHibrido';
import GerenciarInversoresBaterias from '@/components/ferramentas/GerenciarInversoresBaterias';
import { getKits } from '@/data/store';
import type { Kit } from '@/data/types';
import { toast } from 'sonner';

/** Modo de exibição — 'interno' (equipe, hoje) vs 'publico' (cliente, ainda sem rota ligada).
 *  Mantido como prop pra não precisar reescrever a tela quando a versão pública for ligada. */
type Modo = 'interno' | 'publico';

function Stepper({ value, onChange, min = 0, max, step = 1 }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) {
  const ajustar = (delta: number) => {
    let v = value + delta;
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    onChange(Math.round(v * 1000) / 1000);
  };
  return (
    <div className="inline-flex items-center border border-input rounded-lg overflow-hidden bg-background">
      <button type="button" onClick={() => ajustar(-step)} className="w-8 h-8 flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90" aria-label="Diminuir">
        <Minus className="w-3.5 h-3.5" />
      </button>
      <input
        type="number"
        value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="w-14 text-center text-sm bg-transparent focus:outline-none [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button type="button" onClick={() => ajustar(step)} className="w-8 h-8 flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90" aria-label="Aumentar">
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function SimuladorHibridoPage({ modo = 'interno' }: { modo?: Modo }) {
  const [placas, setPlacas] = useState(10);
  const [placaId, setPlacaId] = useState<string>('');
  const [socInicial, setSocInicial] = useState(50);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set(SELECIONADOS_FALLBACK));
  const [configs, setConfigs] = useState<Record<string, ConfigItem>>({});
  const [catalogo, setCatalogo] = useState<CategoriaCatalogo[]>(CATALOGO_FALLBACK);
  const [carregandoCatalogo, setCarregandoCatalogo] = useState(true);
  const [gerenciarAberto, setGerenciarAberto] = useState(false);

  const [inversores, setInversores] = useState<InversorHibrido[]>([]);
  const [baterias, setBaterias] = useState<BateriaHibrida[]>([]);
  const [inversorId, setInversorId] = useState<string>('');
  const [bateriaId, setBateriaId] = useState<string>('');
  const [qtdBateria, setQtdBateria] = useState(1);
  const [gerenciarEquipAberto, setGerenciarEquipAberto] = useState(false);

  const carregarInversoresBaterias = async () => {
    try {
      const [inv, bat] = await Promise.all([getInversoresHibridoDB(true), getBateriasHibridoDB(true)]);
      setInversores(inv);
      setBaterias(bat);
      setInversorId(prev => prev || inv[0]?.id || '');
      setBateriaId(prev => prev || bat[0]?.id || '');
    } catch (e: any) {
      toast.error('Não consegui carregar inversores/baterias do banco.');
    }
  };

  useEffect(() => { carregarInversoresBaterias(); }, []);

  // Placas: puxa do catálogo real da calculadora (equipamentos_kits), não um valor fixo.
  const placasDisponiveis = useMemo(() => {
    const todas = getKits().filter(k => k.type === 'placa' && k.active);
    const porModelo = new Map<string, Kit>();
    todas.forEach(k => { const chave = `${k.brand}__${k.model}__${k.power}`; if (!porModelo.has(chave)) porModelo.set(chave, k); });
    return Array.from(porModelo.values());
  }, []);
  useEffect(() => {
    if (!placaId && placasDisponiveis.length > 0) setPlacaId(placasDisponiveis[0].id);
  }, [placasDisponiveis, placaId]);
  const placaSelecionada = placasDisponiveis.find(p => p.id === placaId) || null;

  const inversorSelecionado = inversores.find(i => i.id === inversorId) || null;
  const bateriaSelecionada = baterias.find(b => b.id === bateriaId) || null;

  const capacidadeNominalTotalKwh = bateriaSelecionada ? bateriaSelecionada.capacidadeKwh * qtdBateria : 0;
  const capacidadeUtilKwh = bateriaSelecionada ? capacidadeNominalTotalKwh * (bateriaSelecionada.dodPct / 100) : 0;

  const carregarCatalogo = async () => {
    setCarregandoCatalogo(true);
    try {
      const rows = await getEquipamentosHibridoDB(true);
      if (rows.length > 0) {
        setCatalogo(agruparPorCategoria(rows));
        setSelecionados(new Set(rows.filter(r => r.selecionado_padrao).map(r => r.id)));
      }
      // se vier vazio, mantém o catálogo fixo do código como rede de segurança
    } catch (e: any) {
      toast.error('Não consegui carregar o catálogo do banco — usando a lista padrão do sistema.');
    } finally {
      setCarregandoCatalogo(false);
    }
  };

  useEffect(() => { carregarCatalogo(); }, []);

  const potenciaKwp = placaSelecionada ? (placaSelecionada.power / 1000) * placas : 0;

  const todosItens = useMemo(() => catalogo.flatMap(c => c.itens), [catalogo]);

  const getConfig = (item: ItemCatalogo): ConfigItem => {
    const c = configs[item.id];
    if (c) return c;
    return {
      qtd: 1,
      tempo: item.tipo === 'tempo_ajustavel' ? item.padrao : undefined,
      km: item.kmDia,
    };
  };

  const updateConfig = (id: string, patch: Partial<ConfigItem>) => {
    setConfigs(prev => ({ ...prev, [id]: { ...(prev[id] || { qtd: 1 }), ...patch } }));
  };

  const toggleItem = (id: string) => {
    setSelecionados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const itensSelecionados: ItemSelecionado[] = useMemo(() => {
    return todosItens
      .filter(item => selecionados.has(item.id))
      .map(item => ({ item, config: getConfig(item) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selecionados, configs, todosItens]);

  const resultado = useMemo(() => calcularSimulacaoHibrida({
    potenciaKwp,
    capacidadeBateriaKwh: capacidadeUtilKwh,
    socInicialPct: socInicial,
    itensSelecionados,
  }), [potenciaKwp, capacidadeUtilKwh, socInicial, itensSelecionados]);

  // ── Checagens de compatibilidade e dimensionamento ──
  const avisos: string[] = [];
  if (inversorSelecionado && bateriaSelecionada) {
    if (inversorSelecionado.tipoTensaoBateria !== bateriaSelecionada.tipoTensao) {
      avisos.push(`Incompatível: o inversor trabalha em ${inversorSelecionado.tipoTensaoBateria === 'low_voltage' ? 'Low Voltage' : 'High Voltage'} e a bateria é ${bateriaSelecionada.tipoTensao === 'low_voltage' ? 'Low Voltage' : 'High Voltage'}.`);
    } else if (inversorSelecionado.tipoTensaoBateria === 'low_voltage' && inversorSelecionado.tensaoBateriaV != null && bateriaSelecionada.tensaoNominalV != null && inversorSelecionado.tensaoBateriaV !== bateriaSelecionada.tensaoNominalV) {
      avisos.push(`Tensão nominal diferente: inversor espera ${inversorSelecionado.tensaoBateriaV}V, bateria é ${bateriaSelecionada.tensaoNominalV}V.`);
    }
  }
  if (inversorSelecionado?.potenciaFvMaxKwp != null && potenciaKwp > inversorSelecionado.potenciaFvMaxKwp) {
    avisos.push(`As placas (${potenciaKwp.toFixed(2)} kWp) excedem o limite de entrada FV do inversor (${inversorSelecionado.potenciaFvMaxKwp} kWp).`);
  }
  const limitePicoInversor = inversorSelecionado?.potenciaPicoKw ?? inversorSelecionado?.potenciaNominalKw ?? null;
  const limitePicoBateria = (bateriaSelecionada?.correnteMaxDescargaPicoA != null && bateriaSelecionada?.tensaoNominalV != null)
    ? (bateriaSelecionada.correnteMaxDescargaPicoA * bateriaSelecionada.tensaoNominalV * qtdBateria) / 1000
    : null;
  if (limitePicoInversor != null && resultado.picoMaximoAcumuladoKw > limitePicoInversor) {
    avisos.push(`O pico máximo acumulado (${resultado.picoMaximoAcumuladoKw.toFixed(2)} kW) excede a capacidade de surto do inversor (${limitePicoInversor.toFixed(2)} kW).`);
  }
  if (limitePicoBateria != null && resultado.picoMaximoAcumuladoKw > limitePicoBateria) {
    avisos.push(`O pico máximo acumulado (${resultado.picoMaximoAcumuladoKw.toFixed(2)} kW) excede a descarga de pico da bateria (${limitePicoBateria.toFixed(2)} kW).`);
  }

  const consumoMedioKw = resultado.consumoDiarioTotalKwh / 24;
  const autonomiaHoras = consumoMedioKw > 0 ? capacidadeUtilKwh / consumoMedioKw : 0;

  const dadosGrafico = resultado.pontos.map(p => ({
    label: p.label,
    'Geração (kW)': p.geracaoKw,
    'Consumo (kW)': p.consumoKw,
    'Carga da bateria (kWh)': p.socKwh,
    'Capacidade máxima': capacidadeUtilKwh,
  }));

  const totalVindoDaRede = resultado.pontos.reduce((a, p) => a + p.vindoDaRedeKwh, 0);

  return (
    <div className="max-w-6xl mx-auto">
      {modo === 'interno' && (
        <Link to="/ferramentas" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Ferramentas
        </Link>
      )}

      <div className="flex items-center gap-3 mb-2">
        <Battery className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Simulador Híbrido — 3 dias</h1>
          <p className="text-sm text-muted-foreground">Geração, consumo e comportamento da bateria em 72h contínuas</p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
        Simula três cenários reais em sequência — um dia nublado, um típico e um de céu limpo — cruzando com o
        consumo dos equipamentos selecionados e a carga da bateria hora a hora.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {ORDEM_DIAS.map(dia => (
          <div key={dia} className="solar-card p-3 border-l-4" style={{ borderLeftColor: dia === 'nublado' ? '#8b93a6' : dia === 'tipico' ? 'hsl(var(--secondary))' : 'hsl(var(--primary))' }}>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Dia {NOME_DIA[dia]}</p>
            <p className="text-lg font-bold text-foreground">{GERACAO_DIARIA_TOTAL[dia].toFixed(2)} kWh/kWp</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* CONFIGURAÇÃO */}
        <div className="space-y-5">
          <div className="solar-card p-5 space-y-4">
            <h2 className="font-bold text-primary">Sistema</h2>
            <div>
              <label className="block text-sm font-medium mb-1.5">Placa</label>
              <select value={placaId} onChange={e => setPlacaId(e.target.value)} className="solar-input">
                <option value="">Selecione...</option>
                {placasDisponiveis.map(p => <option key={p.id} value={p.id}>{p.brand} {p.model} — {p.power} Wp</option>)}
              </select>
              {placasDisponiveis.length === 0 && <p className="text-xs text-muted-foreground mt-1">Nenhuma placa ativa no catálogo da calculadora.</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Quantidade de placas</label>
              <Stepper value={placas} onChange={setPlacas} min={1} max={200} />
              <p className="text-xs text-muted-foreground mt-1">{potenciaKwp.toFixed(2)} kWp instalado</p>
            </div>

            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium">Inversor híbrido</label>
              {modo === 'interno' && (
                <button onClick={() => setGerenciarEquipAberto(true)} className="text-xs text-primary hover:underline flex items-center gap-1">
                  <Settings2 className="w-3.5 h-3.5" /> Gerenciar
                </button>
              )}
            </div>
            <select value={inversorId} onChange={e => setInversorId(e.target.value)} className="solar-input">
              <option value="">Selecione...</option>
              {inversores.map(i => <option key={i.id} value={i.id}>{i.marca} {i.modelo} — {i.potenciaNominalKw} kW</option>)}
            </select>
            {inversores.length === 0 && <p className="text-xs text-muted-foreground -mt-2">Nenhum inversor cadastrado ainda.</p>}

            <div>
              <label className="block text-sm font-medium mb-1.5">Bateria</label>
              <select value={bateriaId} onChange={e => setBateriaId(e.target.value)} className="solar-input">
                <option value="">Selecione...</option>
                {baterias.map(b => <option key={b.id} value={b.id}>{b.marca} {b.modelo} — {b.capacidadeKwh} kWh</option>)}
              </select>
              {baterias.length === 0 && <p className="text-xs text-muted-foreground mt-1">Nenhuma bateria cadastrada ainda.</p>}
            </div>

            {bateriaSelecionada?.empilhavel && (
              <div>
                <label className="block text-sm font-medium mb-1.5">Unidades de bateria (empilhadas)</label>
                <Stepper value={qtdBateria} onChange={setQtdBateria} min={1} max={bateriaSelecionada.maxUnidadesParalelo || 10} />
              </div>
            )}

            {bateriaSelecionada && (
              <p className="text-xs text-muted-foreground">
                {capacidadeNominalTotalKwh.toFixed(1)} kWh nominal × DoD {bateriaSelecionada.dodPct}% = <strong className="text-foreground">{capacidadeUtilKwh.toFixed(1)} kWh útil</strong>
              </p>
            )}

            <div>
              <label className="block text-sm font-medium mb-1.5">Carga inicial da bateria (%)</label>
              <input
                type="number" min={0} max={100} step={5}
                value={socInicial}
                onChange={e => setSocInicial(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                className="solar-input"
              />
            </div>
          </div>

          <div className="solar-card p-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold text-primary">Equipamentos</h2>
              {modo === 'interno' && (
                <button onClick={() => setGerenciarAberto(true)} className="text-xs text-primary hover:underline flex items-center gap-1">
                  <Settings2 className="w-3.5 h-3.5" /> Gerenciar catálogo
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-3">Marque o que o cliente tem. Itens com tempo ajustável mostram um campo extra.</p>
            {carregandoCatalogo && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando catálogo...</p>
            )}
            <div className="space-y-1">
              {catalogo.map(grupo => {
                const temSelecionado = grupo.itens.some(i => selecionados.has(i.id));
                return (
                  <details key={grupo.categoria} open={temSelecionado} className="border-b border-border pb-1">
                    <summary className="cursor-pointer text-sm font-semibold py-2 flex items-center justify-between list-none">
                      {grupo.categoria}
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </summary>
                    <div className="space-y-2 pb-2">
                      {grupo.itens.map(item => {
                        const marcado = selecionados.has(item.id);
                        const cfg = getConfig(item);
                        return (
                          <div key={item.id} className="flex items-start gap-2 text-sm">
                            <input type="checkbox" checked={marcado} onChange={() => toggleItem(item.id)} className="mt-1 accent-primary" />
                            <div className="flex-1 min-w-0">
                              <p className="leading-tight">{item.nome}</p>
                              <p className="text-[11px] text-muted-foreground">{item.pot} kW{item.kmDia !== undefined ? ' · uso: km/dia' : ''}</p>
                              {marcado && (
                                <div className="mt-1.5 space-y-1.5">
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="text-muted-foreground w-24 shrink-0">Quantidade:</span>
                                    <Stepper value={cfg.qtd} onChange={v => updateConfig(item.id, { qtd: v })} min={0} />
                                  </div>
                                  {item.tipo === 'tempo_ajustavel' && (
                                    <div className="flex items-center gap-2 text-xs">
                                      <span className="text-muted-foreground w-24 shrink-0">Tempo ligado/dia:</span>
                                      <Stepper
                                        value={cfg.tempo ?? item.padrao}
                                        onChange={v => updateConfig(item.id, { tempo: v })}
                                        min={0}
                                        step={item.unidade === 'min' ? 5 : 1}
                                      />
                                      <span className="text-muted-foreground">{item.unidade}</span>
                                    </div>
                                  )}
                                  {item.kmDia !== undefined && (
                                    <div className="flex items-center gap-2 text-xs">
                                      <span className="text-muted-foreground w-24 shrink-0">Km rodados/dia:</span>
                                      <Stepper value={cfg.km ?? item.kmDia} onChange={v => updateConfig(item.id, { km: v })} min={0} step={5} />
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                );
              })}
            </div>
          </div>
        </div>

        {/* RESULTADOS */}
        <div className="space-y-4">
          <div className="solar-card p-5">
            <h2 className="font-bold text-primary mb-1">Geração, consumo e carga da bateria</h2>
            <p className="text-xs text-muted-foreground mb-4">
              72 horas contínuas — geração, consumo e carga da bateria na mesma escala (kW/kWh), pra comparar diretamente.
              Sobe com sobra de geração, desce quando o consumo é maior; ao zerar, o consumo passa a vir da rede.
            </p>
            <div style={{ width: '100%', height: 340 }}>
              <ResponsiveContainer>
                <ComposedChart data={dadosGrafico} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={5} />
                  <YAxis tick={{ fontSize: 11 }} label={{ value: 'kW / kWh', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="Geração (kW)" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="Consumo (kW)" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.1} strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="Carga da bateria (kWh)" stroke="hsl(var(--secondary))" fill="hsl(var(--secondary))" fillOpacity={0.25} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Capacidade máxima" stroke="#bdbaa8" strokeDasharray="4 4" strokeWidth={1} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {avisos.length > 0 && (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/40 space-y-1.5">
              <p className="text-xs font-bold text-destructive flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Verificar compatibilidade</p>
              {avisos.map((a, i) => <p key={i} className="text-xs text-destructive/90">• {a}</p>)}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="solar-card p-4">
              <p className="text-xs text-muted-foreground">Consumo diário estimado</p>
              <p className="text-lg font-bold text-foreground">{resultado.consumoDiarioTotalKwh.toFixed(2)} kWh</p>
            </div>
            <div className="solar-card p-4">
              <p className="text-xs text-muted-foreground">Potência instalada</p>
              <p className="text-lg font-bold text-foreground">{potenciaKwp.toFixed(2)} kWp</p>
            </div>
            <div className="solar-card p-4">
              <p className="text-xs text-muted-foreground">Vindo da rede (72h)</p>
              <p className="text-lg font-bold text-foreground">{totalVindoDaRede.toFixed(2)} kWh</p>
            </div>
            <div className="solar-card p-4">
              <p className="text-xs text-muted-foreground">Potência nominal acumulada</p>
              <p className="text-lg font-bold text-foreground">{resultado.potenciaNominalAcumuladaKw.toFixed(2)} kW</p>
              <p className="text-[10px] text-muted-foreground">Todos ligados ao mesmo tempo, sem surto</p>
            </div>
            <div className="solar-card p-4 border-amber-500/40 border">
              <p className="text-xs text-muted-foreground">Pico máximo acumulado</p>
              <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{resultado.picoMaximoAcumuladoKw.toFixed(2)} kW</p>
              <p className="text-[10px] text-muted-foreground">Cenário conservador — todos partindo juntos, com surto</p>
            </div>
            {bateriaSelecionada && (
              <div className="solar-card p-4">
                <p className="text-xs text-muted-foreground">Autonomia estimada</p>
                <p className="text-lg font-bold text-foreground">{autonomiaHoras >= 24 ? `${(autonomiaHoras / 24).toFixed(1)} dias` : `${autonomiaHoras.toFixed(1)} h`}</p>
                <p className="text-[10px] text-muted-foreground">Só bateria, sem geração, no consumo médio</p>
              </div>
            )}
          </div>

          {resultado.itensComPico.length > 0 && (
            <div className="solar-card p-4">
              <p className="text-xs font-semibold text-foreground mb-2">Equipamentos com potência de pico cadastrada</p>
              <div className="space-y-1">
                {resultado.itensComPico.map(i => (
                  <div key={i.id} className="flex justify-between text-xs text-muted-foreground">
                    <span>{i.nome}{i.qtd > 1 ? ` (×${i.qtd})` : ''}</span>
                    <span className="font-medium text-foreground">{(i.picoKw * i.qtd).toFixed(2)} kW de pico</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Curvas de geração baseadas em 9 dias reais de referência medidos em campo (3 de céu limpo, 3 típicos,
              3 nublados), normalizados por 1 kWp instalado. O dia nublado usado é o pior caso registrado — mantido
              assim de propósito, pois reflete dias de chuva forte reais na região, não uma média confortável.
              Sistema sempre considera rede de apoio: não há garantia de autonomia total em dia ruim, o objetivo é
              mostrar quanto se reduz a dependência da rede.
            </p>
          </div>
        </div>
      </div>

      {gerenciarAberto && (
        <GerenciarCatalogoHibrido
          onClose={() => setGerenciarAberto(false)}
          onSalvo={carregarCatalogo}
        />
      )}

      {gerenciarEquipAberto && (
        <GerenciarInversoresBaterias
          onClose={() => setGerenciarEquipAberto(false)}
          onSalvo={carregarInversoresBaterias}
        />
      )}
    </div>
  );
}
