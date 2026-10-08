import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Calculator, Copy, Plus, Trash2, AlertTriangle, ChevronDown, ChevronUp, Settings2,
} from 'lucide-react';
import { toast } from 'sonner';
import MoneyInput from '@/components/ui/money-input';
import { getReceivablesConfig, saveReceivablesConfig } from '@/data/receivablesStore';
import {
  ParcelaInput, ConfigAntecipacao, Periodicidade, IofMode,
  reaisParaCents, centsParaReais, formatBRL, formatDataBR,
  gerarParcelas, calcularOperacao, resolverValorMinimo,
  gerarPropostaCliente, distribuirPorPeso,
} from '@/data/receivablesCalc';

function hojeISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type Modo = 'liquido' | 'bruto';

interface ParcelaLinha {
  id: string;
  valorReais: number;
  peso: number;
  vencimentoNominal: string;
  antecipar: boolean;
  rotulo?: string;
}

export default function AntecipacaoRecebiveisPage() {
  const [config, setConfig] = useState<ConfigAntecipacao>(getReceivablesConfig());
  const [mostrarConfig, setMostrarConfig] = useState(false);

  const [modo, setModo] = useState<Modo>('liquido');
  const [dataOperacao, setDataOperacao] = useState(hojeISO());

  // Construtor de parcelas
  const [numParcelas, setNumParcelas] = useState(4);
  const [periodicidade, setPeriodicidade] = useState<Periodicidade>('mensal');
  const [incluirAVista, setIncluirAVista] = useState(false);
  const [parcelas, setParcelas] = useState<ParcelaLinha[]>([]);

  // Modo B — valor bruto conhecido
  const [valorBrutoReais, setValorBrutoReais] = useState(0);

  // Modo A — líquido desejado
  const [liquidoDesejadoReais, setLiquidoDesejadoReais] = useState(0);
  const [margemFixaReais, setMargemFixaReais] = useState(0);
  const [margemPercentual, setMargemPercentual] = useState(0);

  const [mostrarDetalhesNaProposta, setMostrarDetalhesNaProposta] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const totalBaseReais = modo === 'bruto' ? valorBrutoReais : liquidoDesejadoReais;

  const gerarTabelaParcelas = () => {
    const base = gerarParcelas({
      dataOperacao,
      numParcelas,
      periodicidade,
      incluirAVista,
      valorTotalCents: reaisParaCents(modo === 'bruto' ? (valorBrutoReais || 1) : 1), // valor é recalculado ao vivo em modo A
    });
    setParcelas(base.map(p => ({
      id: p.id,
      valorReais: centsParaReais(p.valorCents),
      peso: 1,
      vencimentoNominal: p.vencimentoNominal,
      antecipar: p.antecipar,
      rotulo: p.rotulo,
    })));
  };

  const atualizarParcela = (id: string, patch: Partial<ParcelaLinha>) => {
    setParcelas(prev => prev.map(p => (p.id === id ? { ...p, ...patch } : p)));
  };

  const removerParcela = (id: string) => setParcelas(prev => prev.filter(p => p.id !== id));

  const adicionarParcela = () => {
    setParcelas(prev => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        valorReais: 0,
        peso: 1,
        vencimentoNominal: dataOperacao,
        antecipar: true,
      },
    ]);
  };

  // --- Resultado Modo B (valor bruto conhecido) ---------------------------
  const resultadoBruto = useMemo(() => {
    if (modo !== 'bruto' || parcelas.length === 0) return null;
    const inputs: ParcelaInput[] = parcelas.map(p => ({
      id: p.id,
      valorCents: reaisParaCents(p.valorReais),
      vencimentoNominal: p.vencimentoNominal,
      antecipar: p.antecipar,
      rotulo: p.rotulo,
    }));
    return calcularOperacao(inputs, dataOperacao, config);
  }, [modo, parcelas, dataOperacao, config]);

  // --- Resultado Modo A (líquido desejado) ---------------------------------
  const resultadoSolver = useMemo(() => {
    if (modo !== 'liquido' || parcelas.length === 0 || liquidoDesejadoReais <= 0) return null;
    return resolverValorMinimo({
      pesos: parcelas.map(p => p.peso || 1),
      datasVencimento: parcelas.map(p => p.vencimentoNominal),
      antecipar: parcelas.map(p => p.antecipar),
      rotulos: parcelas.map(p => p.rotulo),
      dataOperacao,
      config,
      liquidoDesejadoCents: reaisParaCents(liquidoDesejadoReais),
      margemFixaReais,
      margemPercentual,
    });
  }, [modo, parcelas, dataOperacao, config, liquidoDesejadoReais, margemFixaReais, margemPercentual]);

  const resultadoFinal = modo === 'bruto' ? resultadoBruto : resultadoSolver?.resultadoSugerido ?? null;

  const copiarProposta = async () => {
    if (!resultadoFinal) return;
    const texto = gerarPropostaCliente({
      resultado: resultadoFinal,
      dataOperacao,
      mostrarDetalhesFinanceiros: mostrarDetalhesNaProposta,
    });
    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    toast.success('Proposta copiada!');
    setTimeout(() => setCopiado(false), 2000);
  };

  const salvarConfig = (patch: Partial<ConfigAntecipacao>) => {
    const novo = { ...config, ...patch };
    setConfig(novo);
    saveReceivablesConfig(novo);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <Link to="/ferramentas" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Ferramentas
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <Calculator className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calculadora de Antecipação de Recebíveis</h1>
          <p className="text-sm text-muted-foreground">Calcula quanto cobrar do cliente para que, após a antecipação no banco, sobre o valor líquido desejado</p>
        </div>
      </div>

      {/* Modo */}
      <div className="solar-card p-5 mb-4">
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={() => setModo('liquido')}
            className={`py-2.5 rounded-lg text-sm font-semibold transition-colors ${modo === 'liquido' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            Quero um líquido específico
          </button>
          <button
            onClick={() => setModo('bruto')}
            className={`py-2.5 rounded-lg text-sm font-semibold transition-colors ${modo === 'bruto' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            Já sei o valor bruto da venda
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Data da operação</label>
            <input type="date" className="solar-input" value={dataOperacao} onChange={e => setDataOperacao(e.target.value)} />
          </div>
          {modo === 'bruto' ? (
            <div>
              <label className="block text-sm font-medium mb-1.5">Valor bruto da venda (R$)</label>
              <MoneyInput className="solar-input" value={valorBrutoReais} onChange={setValorBrutoReais} placeholder="Ex: 22.958,16" />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-1.5">Líquido desejado (R$)</label>
              <MoneyInput className="solar-input" value={liquidoDesejadoReais} onChange={setLiquidoDesejadoReais} placeholder="Ex: 20.000,00" />
            </div>
          )}
        </div>

        {modo === 'liquido' && (
          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Margem de segurança fixa (R$)</label>
              <MoneyInput className="solar-input" value={margemFixaReais} onChange={setMargemFixaReais} placeholder="0,00" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Margem de segurança (%)</label>
              <input type="number" step="0.1" className="solar-input" value={margemPercentual || ''}
                onChange={e => setMargemPercentual(parseFloat(e.target.value) || 0)} placeholder="0" />
            </div>
          </div>
        )}
      </div>

      {/* Construtor de parcelas */}
      <div className="solar-card p-5 mb-4">
        <h2 className="font-semibold text-foreground mb-3">Parcelas</h2>
        <div className="grid sm:grid-cols-4 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Nº de parcelas</label>
            <input type="number" min={1} className="solar-input" value={numParcelas}
              onChange={e => setNumParcelas(Math.max(1, parseInt(e.target.value) || 1))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Periodicidade</label>
            <select className="solar-input" value={periodicidade} onChange={e => setPeriodicidade(e.target.value as Periodicidade)}>
              <option value="semanal">Semanal (7 dias)</option>
              <option value="quinzenal">Quinzenal (15 dias)</option>
              <option value="mensal">Mensal (mês calendário)</option>
              <option value="personalizado">Personalizado (editar datas manualmente)</option>
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm pb-3">
              <input type="checkbox" checked={incluirAVista} onChange={e => setIncluirAVista(e.target.checked)} className="w-4 h-4" />
              1ª parcela à vista
            </label>
          </div>
          <div className="flex items-end">
            <button onClick={gerarTabelaParcelas} className="solar-btn-secondary w-full py-2.5 text-sm">Gerar parcelas</button>
          </div>
        </div>

        {parcelas.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="py-2 pr-2">Parcela</th>
                  {modo === 'bruto' ? <th className="py-2 pr-2">Valor (R$)</th> : <th className="py-2 pr-2">Peso</th>}
                  <th className="py-2 pr-2">Vencimento</th>
                  <th className="py-2 pr-2 text-center">Antecipar?</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {parcelas.map((p, idx) => (
                  <tr key={p.id} className="border-b border-border/50">
                    <td className="py-2 pr-2 font-medium">{idx + 1}ª{p.rotulo ? ` (${p.rotulo})` : ''}</td>
                    <td className="py-2 pr-2">
                      {modo === 'bruto' ? (
                        <MoneyInput className="solar-input py-1.5" value={p.valorReais} onChange={v => atualizarParcela(p.id, { valorReais: v })} />
                      ) : (
                        <input type="number" min={0} step="0.1" className="solar-input py-1.5" value={p.peso}
                          onChange={e => atualizarParcela(p.id, { peso: parseFloat(e.target.value) || 0 })} />
                      )}
                    </td>
                    <td className="py-2 pr-2">
                      <input type="date" className="solar-input py-1.5" value={p.vencimentoNominal}
                        onChange={e => atualizarParcela(p.id, { vencimentoNominal: e.target.value })} />
                    </td>
                    <td className="py-2 pr-2 text-center">
                      <input type="checkbox" className="w-4 h-4" checked={p.antecipar}
                        onChange={e => atualizarParcela(p.id, { antecipar: e.target.checked })} />
                    </td>
                    <td className="py-2 text-right">
                      <button onClick={() => removerParcela(p.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={adicionarParcela} className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline">
              <Plus className="w-4 h-4" /> Adicionar parcela
            </button>
          </div>
        )}
      </div>

      {/* Configurações avançadas */}
      <div className="solar-card p-5 mb-4">
        <button onClick={() => setMostrarConfig(v => !v)} className="w-full flex items-center justify-between font-semibold text-foreground">
          <span className="flex items-center gap-2"><Settings2 className="w-4 h-4" /> Configurações avançadas (taxas, TAC, IOF)</span>
          {mostrarConfig ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {mostrarConfig && (
          <div className="mt-4 space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">TAC (R$, cobrada uma vez)</label>
                <MoneyInput className="solar-input" value={config.tacReais} onChange={v => salvarConfig({ tacReais: v })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Taxa manual (% a.m.) — sobrepõe a tabela</label>
                <input type="number" step="0.01" className="solar-input" value={config.taxaManualPct ?? ''}
                  placeholder="automático por faixa"
                  onChange={e => salvarConfig({ taxaManualPct: e.target.value === '' ? null : parseFloat(e.target.value) })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Outras taxas fixas (R$)</label>
                <MoneyInput className="solar-input" value={config.outrasTaxasReais} onChange={v => salvarConfig({ outrasTaxasReais: v })} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">Tabela de taxas por volume antecipado (% a.m.)</label>
              <div className="grid sm:grid-cols-5 gap-2">
                {config.tabelaTaxas.map((f, i) => (
                  <div key={i}>
                    <span className="block text-[11px] text-muted-foreground mb-1">
                      {f.ateReais === Infinity ? `> ${formatBRL(reaisParaCents(config.tabelaTaxas[i - 1]?.ateReais ?? 0))}` : `até ${formatBRL(reaisParaCents(f.ateReais))}`}
                    </span>
                    <input type="number" step="0.01" className="solar-input py-1.5" value={f.taxaMensalPct}
                      onChange={e => {
                        const nova = config.tabelaTaxas.map((x, j) => (j === i ? { ...x, taxaMensalPct: parseFloat(e.target.value) || 0 } : x));
                        salvarConfig({ tabelaTaxas: nova });
                      }} />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Modo de IOF</label>
                <select className="solar-input" value={config.iofMode} onChange={e => salvarConfig({ iofMode: e.target.value as IofMode })}>
                  <option value="AUTO">Automático (Simples Nacional + ≤R$30.000)</option>
                  <option value="SIMPLES_REDUZIDO">Forçar alíquota reduzida (0,00274%/dia)</option>
                  <option value="PJ_NORMAL">Forçar alíquota normal (0,0082%/dia)</option>
                  <option value="PERSONALIZADO">Personalizado</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Alíquota adicional do IOF (%)</label>
                <input type="number" step="0.01" className="solar-input" value={config.iofAdicionalPct}
                  onChange={e => salvarConfig({ iofAdicionalPct: parseFloat(e.target.value) || 0 })} />
              </div>
              {config.iofMode === 'AUTO' && (
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm pb-3">
                    <input type="checkbox" checked={config.simplesNacional} onChange={e => salvarConfig({ simplesNacional: e.target.checked })} className="w-4 h-4" />
                    Empresa é Simples Nacional
                  </label>
                </div>
              )}
              {config.iofMode === 'PERSONALIZADO' && (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Alíquota diária do IOF (%)</label>
                  <input type="number" step="0.00001" className="solar-input" value={config.iofDiariaPersonalizadaPct ?? ''}
                    onChange={e => salvarConfig({ iofDiariaPersonalizadaPct: parseFloat(e.target.value) || 0 })} />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Feriados locais/customizados (datas, separadas por vírgula, AAAA-MM-DD)</label>
              <input type="text" className="solar-input" value={config.feriadosCustom.join(', ')}
                placeholder="Ex: 2026-07-16"
                onChange={e => salvarConfig({ feriadosCustom: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} />
            </div>
          </div>
        )}
      </div>

      {/* Resultado */}
      {resultadoFinal && (
        <div className="solar-card p-5 mb-4">
          <h2 className="font-semibold text-foreground mb-4">Resultado</h2>

          {resultadoFinal.algumaExcedeuLimiteDias && config.taxaManualPct == null && (
            <div className="mb-4 p-3 rounded-lg flex items-start gap-2 text-sm bg-amber-50 text-amber-800 border border-amber-200">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              Uma ou mais parcelas excedem o limite de {config.limiteDiasTitulo} dias para antecipação (condição do banco). Confirme com o banco uma condição/taxa específica antes de prosseguir.
            </div>
          )}

          {modo === 'liquido' && resultadoSolver && (
            <div className="grid sm:grid-cols-4 gap-3 mb-5">
              <ResumoCard label="Líquido desejado" value={formatBRL(reaisParaCents(liquidoDesejadoReais))} />
              <ResumoCard label="Mínimo a cobrar" value={formatBRL(resultadoSolver.valorMinimoCents)} />
              <ResumoCard label="Margem aplicada" value={formatBRL(resultadoSolver.valorSugeridoCents - resultadoSolver.valorMinimoCents)} />
              <ResumoCard label="Valor sugerido ao cliente" value={formatBRL(resultadoSolver.valorSugeridoCents)} destaque />
            </div>
          )}

          <div className="grid sm:grid-cols-4 gap-3 mb-5">
            <ResumoCard label="Valor bruto" value={formatBRL(resultadoFinal.totalBrutoCents)} />
            <ResumoCard label="Juros" value={formatBRL(resultadoFinal.totalJurosCents)} />
            <ResumoCard label="IOF" value={formatBRL(resultadoFinal.totalIofCents)} />
            <ResumoCard label="Líquido projetado" value={formatBRL(resultadoFinal.totalLiquidoCents)} destaque />
          </div>

          <p className="text-xs text-muted-foreground mb-4">
            Taxa aplicada: {resultadoFinal.taxaMensalPct.toFixed(2)}% a.m. ({resultadoFinal.faixaOrigem === 'manual' ? 'manual' : 'por faixa de volume'}) ·
            {' '}IOF: {resultadoFinal.iofAdicionalPctUsado}% + {resultadoFinal.iofDiariaPctUsado}%/dia ({resultadoFinal.iofEhReduzido ? 'reduzido' : 'normal'}) ·
            {' '}TAC: {formatBRL(resultadoFinal.tacCents)}
          </p>

          <div className="overflow-x-auto mb-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="py-2 pr-2">Parcela</th>
                  <th className="py-2 pr-2 text-right">Valor</th>
                  <th className="py-2 pr-2">Venc. nominal</th>
                  <th className="py-2 pr-2">Data financeira</th>
                  <th className="py-2 pr-2 text-right">Dias</th>
                  <th className="py-2 pr-2 text-right">Taxa</th>
                  <th className="py-2 pr-2 text-right">Juros</th>
                  <th className="py-2 pr-2 text-right">IOF</th>
                  <th className="py-2 pr-2 text-right">Líquido</th>
                </tr>
              </thead>
              <tbody>
                {resultadoFinal.parcelas.map((p, idx) => (
                  <tr key={p.id} className={`border-b border-border/50 ${p.alertaLimiteDias ? 'bg-amber-50' : ''}`}>
                    <td className="py-2 pr-2 font-medium">{idx + 1}ª{p.rotulo ? ` (${p.rotulo})` : ''}</td>
                    <td className="py-2 pr-2 text-right">{formatBRL(p.valorCents)}</td>
                    <td className="py-2 pr-2">{formatDataBR(p.vencimentoNominal)}</td>
                    <td className="py-2 pr-2">{formatDataBR(p.dataFinanceira)}</td>
                    <td className="py-2 pr-2 text-right">{p.antecipar ? p.dias : '—'}</td>
                    <td className="py-2 pr-2 text-right">{p.antecipar ? `${p.taxaMensalPct.toFixed(2)}%` : '—'}</td>
                    <td className="py-2 pr-2 text-right">{p.antecipar ? formatBRL(p.jurosCents) : '—'}</td>
                    <td className="py-2 pr-2 text-right">{p.antecipar ? formatBRL(p.iofCents) : '—'}</td>
                    <td className="py-2 pr-2 text-right font-semibold">{formatBRL(p.liquidoCents)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold border-t border-border">
                  <td className="py-2 pr-2">Total</td>
                  <td className="py-2 pr-2 text-right">{formatBRL(resultadoFinal.totalBrutoCents)}</td>
                  <td colSpan={3}></td>
                  <td className="py-2 pr-2 text-right">{formatBRL(resultadoFinal.totalJurosCents)}</td>
                  <td className="py-2 pr-2 text-right">{formatBRL(resultadoFinal.totalIofCents)}</td>
                  <td className="py-2 pr-2 text-right">{formatBRL(resultadoFinal.totalLiquidoCents)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <input type="checkbox" className="w-4 h-4" checked={mostrarDetalhesNaProposta}
              onChange={e => setMostrarDetalhesNaProposta(e.target.checked)} id="detalhes-proposta" />
            <label htmlFor="detalhes-proposta" className="text-sm text-muted-foreground">
              Mostrar juros/IOF/TAC na proposta (por padrão o cliente só vê os valores e vencimentos)
            </label>
          </div>

          <button onClick={copiarProposta} className="solar-btn-primary w-full py-3 flex items-center justify-center gap-2 font-semibold">
            <Copy className="w-4 h-4" /> {copiado ? 'Copiado!' : 'Copiar proposta para cliente'}
          </button>
        </div>
      )}
    </div>
  );
}

function ResumoCard({ label, value, destaque }: { label: string; value: string; destaque?: boolean }) {
  return (
    <div className={`rounded-lg p-3 ${destaque ? 'bg-primary/10 border border-primary/30' : 'bg-muted'}`}>
      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`text-lg font-bold ${destaque ? 'text-primary' : 'text-foreground'}`}>{value}</p>
    </div>
  );
}
