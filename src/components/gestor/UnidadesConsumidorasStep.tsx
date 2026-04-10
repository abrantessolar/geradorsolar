import React from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, Copy } from 'lucide-react';

const PADRAO_LIST = ['Monofásico', 'Bifásico', 'Trifásico'];
const CONC_LIST = ['ELEKTRO', 'ENERGISA', 'COPEL', 'OUTRA'];

export type UCItem = {
  id?: string;
  tipo: 'geradora' | 'beneficiaria';
  codigo_uc: string;
  cep: string;
  endereco: string;
  padrao_entrada: string;
  concessionaria: string;
  nome_titular: string;
  relacao_titular: string;
  percentual: string;
  prioridade: number;
};

export type ModoDistribuicao = 'percentual' | 'prioridade';

function maskCep(v: string) {
  return v.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 9);
}

interface Props {
  ucs: UCItem[];
  setUcs: React.Dispatch<React.SetStateAction<UCItem[]>>;
  modo: ModoDistribuicao;
  setModo: (m: ModoDistribuicao) => void;
  clienteCep?: string;
  clienteEndereco?: string;
  clienteConcessionaria?: string;
}

export function createDefaultGeradora(cep?: string, endereco?: string, concessionaria?: string): UCItem {
  return {
    tipo: 'geradora',
    codigo_uc: '',
    cep: cep || '',
    endereco: endereco || '',
    padrao_entrada: '',
    concessionaria: concessionaria || 'ELEKTRO',
    nome_titular: '',
    relacao_titular: '',
    percentual: '',
    prioridade: 1,
  };
}

export default function UnidadesConsumidorasStep({ ucs, setUcs, modo, setModo, clienteCep, clienteEndereco, clienteConcessionaria }: Props) {
  const inputClass = "solar-input";
  const labelClass = "block text-xs font-medium mb-1";

  const geradora = ucs.find(u => u.tipo === 'geradora');
  const beneficiarias = ucs.filter(u => u.tipo === 'beneficiaria');

  const updateUC = (index: number, field: keyof UCItem, value: string | number) => {
    setUcs(prev => prev.map((u, i) => i === index ? { ...u, [field]: value } : u));
  };

  const addBeneficiaria = () => {
    const newPrio = ucs.length + 1;
    setUcs(prev => [...prev, {
      tipo: 'beneficiaria',
      codigo_uc: '',
      cep: '',
      endereco: '',
      padrao_entrada: '',
      concessionaria: '',
      nome_titular: '',
      relacao_titular: '',
      percentual: '',
      prioridade: newPrio,
    }]);
  };

  const removeBeneficiaria = (globalIndex: number) => {
    setUcs(prev => {
      const next = prev.filter((_, i) => i !== globalIndex);
      // Recalculate priorities
      return next.map((u, i) => ({ ...u, prioridade: i + 1 }));
    });
  };

  const movePriority = (globalIndex: number, direction: 'up' | 'down') => {
    setUcs(prev => {
      const arr = [...prev];
      const targetIdx = direction === 'up' ? globalIndex - 1 : globalIndex + 1;
      if (targetIdx < 0 || targetIdx >= arr.length) return prev;
      // Don't swap with geradora (index 0)
      if (targetIdx === 0 || globalIndex === 0) return prev;
      [arr[globalIndex], arr[targetIdx]] = [arr[targetIdx], arr[globalIndex]];
      return arr.map((u, i) => ({ ...u, prioridade: i + 1 }));
    });
  };

  const fetchCep = async (cep: string, index: number) => {
    const clean = cep.replace(/\D/g, '');
    if (clean.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (data.erro) return;
      const endereco = `${data.logradouro || ''}, ${data.bairro || ''}, ${data.localidade || ''}-${data.uf || ''}`;
      updateUC(index, 'endereco', endereco);
    } catch {}
  };

  // Calculate distribution status for percentual mode
  const beneficiariasPercentSum = beneficiarias.reduce((sum, b) => sum + (parseFloat(b.percentual) || 0), 0);
  const percentOk = Math.abs(beneficiariasPercentSum - 100) < 0.01;
  const percentDiff = 100 - beneficiariasPercentSum;

  const geradoraIndex = ucs.findIndex(u => u.tipo === 'geradora');

  return (
    <div className="space-y-6">
      {/* UC Geradora */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            🏠 Unidade Geradora <span className="text-xs text-muted-foreground">(obrigatória)</span>
          </h3>
          {(clienteCep || clienteEndereco) && (
            <button onClick={() => {
              if (geradoraIndex >= 0) {
                setUcs(prev => prev.map((u, i) => i === geradoraIndex ? {
                  ...u,
                  cep: clienteCep || u.cep,
                  endereco: clienteEndereco || u.endereco,
                  concessionaria: clienteConcessionaria || u.concessionaria,
                } : u));
              }
            }} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium">
              <Copy className="w-3.5 h-3.5" /> Copiar do cliente
            </button>
          )}
        </div>
        {geradora && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-muted/20 rounded-lg p-4">
            <div>
              <label className={labelClass}>Código UC *</label>
              <input className={inputClass} value={geradora.codigo_uc} onChange={e => updateUC(geradoraIndex, 'codigo_uc', e.target.value)} placeholder="Ex: 32005709" />
            </div>
            <div>
              <label className={labelClass}>CEP</label>
              <input className={inputClass} value={geradora.cep} onChange={e => updateUC(geradoraIndex, 'cep', maskCep(e.target.value))} onBlur={() => fetchCep(geradora.cep, geradoraIndex)} placeholder="00000-000" />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Endereço completo</label>
              <input className={inputClass} value={geradora.endereco} onChange={e => updateUC(geradoraIndex, 'endereco', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Padrão de entrada</label>
              <select className={inputClass} value={geradora.padrao_entrada} onChange={e => updateUC(geradoraIndex, 'padrao_entrada', e.target.value)}>
                <option value="">Selecione...</option>
                {PADRAO_LIST.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Concessionária</label>
              <select className={inputClass} value={geradora.concessionaria} onChange={e => updateUC(geradoraIndex, 'concessionaria', e.target.value)}>
                {CONC_LIST.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      <hr className="border-border" />

      {/* Modo de distribuição */}
      <div>
        <h3 className="text-sm font-semibold mb-2">Modo de Distribuição dos Créditos</h3>
        <div className="flex rounded-lg overflow-hidden border border-border w-fit">
          <button
            onClick={() => setModo('percentual')}
            className={`px-4 py-2 text-xs font-medium transition-colors ${modo === 'percentual' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
          >
            Por Percentual
          </button>
          <button
            onClick={() => setModo('prioridade')}
            className={`px-4 py-2 text-xs font-medium transition-colors ${modo === 'prioridade' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
          >
            Por Prioridade
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {modo === 'percentual'
            ? 'Cada UC beneficiária recebe um percentual fixo dos créditos excedentes da UC geradora.'
            : 'Os créditos excedentes são distribuídos por ordem de prioridade — a UC de maior prioridade recebe primeiro.'}
        </p>
      </div>

      <hr className="border-border" />

      {/* UCs Beneficiárias */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">UCs Beneficiárias</h3>
          <button onClick={addBeneficiaria} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium">
            <Plus className="w-3.5 h-3.5" /> Adicionar UC Beneficiária
          </button>
        </div>

        {beneficiarias.length === 0 && (
          <p className="text-xs text-muted-foreground bg-muted/20 rounded-lg p-4 text-center">
            Nenhuma UC beneficiária adicionada. A UC geradora receberá 100% dos créditos.
          </p>
        )}

        <div className="space-y-3">
          {beneficiarias.map((uc, bIdx) => {
            const globalIndex = ucs.findIndex(u => u === uc);
            return (
              <div key={bIdx} className="bg-muted/20 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-primary">
                    🏢 UC Beneficiária {bIdx + 1}
                    {modo === 'prioridade' && <span className="ml-2 text-muted-foreground">#{uc.prioridade}ª prioridade</span>}
                  </span>
                  <div className="flex items-center gap-1">
                    {modo === 'prioridade' && (
                      <>
                        <button onClick={() => movePriority(globalIndex, 'up')} disabled={bIdx === 0}
                          className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30">
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => movePriority(globalIndex, 'down')} disabled={bIdx === beneficiarias.length - 1}
                          className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30">
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    <button onClick={() => removeBeneficiaria(globalIndex)} className="p-1 text-destructive hover:text-destructive/80">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Código UC *</label>
                    <input className={inputClass} value={uc.codigo_uc} onChange={e => updateUC(globalIndex, 'codigo_uc', e.target.value)} placeholder="Ex: 41327802" />
                  </div>
                  <div>
                    <label className={labelClass}>Endereço completo</label>
                    <input className={inputClass} value={uc.endereco} onChange={e => updateUC(globalIndex, 'endereco', e.target.value)} />
                  </div>
                  {modo === 'percentual' && (
                    <div>
                      <label className={labelClass}>Percentual (%)</label>
                      <input className={inputClass} type="number" min="1" max="100" value={uc.percentual} onChange={e => updateUC(globalIndex, 'percentual', e.target.value)} placeholder="Ex: 35" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Percentual validation indicator */}
        {modo === 'percentual' && beneficiarias.length > 0 && (
          <div className={`mt-3 p-3 rounded-lg text-sm font-medium flex items-center gap-2 ${
            percentOk
              ? 'bg-green-500/10 text-green-700 dark:text-green-400'
              : 'bg-red-500/10 text-red-700 dark:text-red-400'
          }`}>
            {percentOk ? (
              <>🟢 100% distribuídos entre as UCs beneficiárias</>
            ) : percentDiff > 0 ? (
              <>🔴 Faltam {percentDiff.toFixed(1)}% para distribuir</>
            ) : (
              <>🔴 {Math.abs(percentDiff).toFixed(1)}% acima do limite</>
            )}
          </div>
        )}

        {/* Priority mode info */}
        {modo === 'prioridade' && beneficiarias.length > 0 && (
          <div className="mt-3 p-3 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs">
            <p className="font-medium mb-1">Ordem de distribuição dos créditos excedentes:</p>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>UC Geradora (principal — sempre é abatida primeiro)</li>
              {beneficiarias.map((b, i) => (
                <li key={i}>UC Beneficiária {i + 1} {b.codigo_uc ? `— ${b.codigo_uc}` : ''}</li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
