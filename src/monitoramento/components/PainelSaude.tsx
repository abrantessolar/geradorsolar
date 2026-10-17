import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Activity, MapPin, RefreshCw, Zap, AlertTriangle, WifiOff, Gauge, ChevronDown, ChevronRight, Receipt } from 'lucide-react';
import { listarUsinasSaude, listarPotenciasRecentes, type PotenciaRecente } from '../lib/usinas';
import { listarKwhPorKwpRecente } from '../lib/diario';
import HistoricoUsina from './HistoricoUsina';
import FaturaUsina from './FaturaUsina';
import type { MonEstadoDiario, MonUsina } from '../types';

// Central de Monitoramento TLS — Fase 2: painel de saúde da frota. Semáforo
// por usina (normal/sem_geracao/baixo_desempenho/offline) — o estado em si
// é calculado e gravado pela edge function `mon-coleta` a cada coleta; esta
// tela só lê e filtra. "baixo_desempenho" nunca é emitido pela coleta hoje
// (a tentativa de basear isso em desvio vs mediana foi removida em
// 2026-10-17 — não achada confiável; ver HistoricoUsina.tsx) — o filtro
// fica aqui só por completude do enum, deve mostrar sempre 0.
//
// kWh/kWp (média recente, sem comparação com nada) aparece na própria
// linha da usina, com o card fechado — pedido do usuário (2026-10-17).

const MARCA_LABEL: Record<string, string> = {
  foxess: 'FoxESS',
  solarman: 'Solarman',
  solis: 'Solis',
  sofarcloud: 'SofarCloud',
  hoymiles: 'Hoymiles',
};

const ESTADO_CONFIG: Record<MonEstadoDiario, { label: string; badge: string; icon: typeof Activity }> = {
  normal: { label: 'Normal', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: Activity },
  sem_geracao: { label: 'Sem geração', badge: 'bg-amber-100 text-amber-700 border-amber-200', icon: AlertTriangle },
  baixo_desempenho: { label: 'Baixo desempenho', badge: 'bg-orange-100 text-orange-700 border-orange-200', icon: Gauge },
  offline: { label: 'Offline', badge: 'bg-red-100 text-red-700 border-red-200', icon: WifiOff },
};

const ESTADO_ORDEM: MonEstadoDiario[] = ['offline', 'sem_geracao', 'baixo_desempenho', 'normal'];

function formatarHaQuanto(iso: string | null): string {
  if (!iso) return 'nunca coletado';
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return 'agora mesmo';
  if (min < 60) return `há ${min} min`;
  const horas = Math.round(min / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.round(horas / 24);
  return `há ${dias} d`;
}

export default function PainelSaude() {
  const [loading, setLoading] = useState(true);
  const [usinas, setUsinas] = useState<MonUsina[]>([]);
  const [potencias, setPotencias] = useState<Map<string, PotenciaRecente>>(new Map());
  const [kwhPorKwp, setKwhPorKwp] = useState<Map<string, number>>(new Map());
  const [filtroMarca, setFiltroMarca] = useState<string>('');
  const [filtroCidade, setFiltroCidade] = useState<string>('');
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [usinaExpandida, setUsinaExpandida] = useState<string | null>(null);
  const [subAbaExpandida, setSubAbaExpandida] = useState<'historico' | 'fatura'>('historico');

  const carregar = async () => {
    setLoading(true);
    try {
      const lista = await listarUsinasSaude();
      setUsinas(lista);
      const ids = lista.map((u) => u.id);
      const [pot, kwp] = await Promise.all([listarPotenciasRecentes(ids), listarKwhPorKwpRecente(ids)]);
      setPotencias(pot);
      setKwhPorKwp(kwp);
    } catch (e: any) {
      toast.error('Erro ao carregar painel de saúde: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const cidades = useMemo(
    () => Array.from(new Set(usinas.map((u) => u.cidade).filter(Boolean))).sort() as string[],
    [usinas]
  );

  const contagens = useMemo(() => {
    const c: Record<MonEstadoDiario, number> = { normal: 0, sem_geracao: 0, baixo_desempenho: 0, offline: 0 };
    usinas.forEach((u) => {
      c[u.estado_atual] = (c[u.estado_atual] ?? 0) + 1;
    });
    return c;
  }, [usinas]);

  const filtradas = useMemo(() => {
    return usinas
      .filter((u) => !filtroMarca || u.marca === filtroMarca)
      .filter((u) => !filtroCidade || u.cidade === filtroCidade)
      .filter((u) => !filtroEstado || u.estado_atual === filtroEstado)
      .sort((a, b) => ESTADO_ORDEM.indexOf(a.estado_atual) - ESTADO_ORDEM.indexOf(b.estado_atual));
  }, [usinas, filtroMarca, filtroCidade, filtroEstado]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold text-primary flex items-center gap-2">
          <Activity className="w-5 h-5" /> Painel de saúde da frota
        </h2>
        <button
          onClick={carregar}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-muted hover:bg-muted/70"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Atualizar
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {ESTADO_ORDEM.map((estado) => {
          const cfg = ESTADO_CONFIG[estado];
          const ativo = filtroEstado === estado;
          return (
            <button
              key={estado}
              onClick={() => setFiltroEstado(ativo ? '' : estado)}
              className={`solar-card p-3 text-left border transition-colors ${
                ativo ? 'ring-2 ring-primary' : ''
              }`}
            >
              <p className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.badge}`}>
                <cfg.icon className="w-3 h-3" /> {cfg.label}
              </p>
              <p className="text-2xl font-bold mt-1.5">{contagens[estado]}</p>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          className="solar-input text-sm py-1.5 px-2"
          value={filtroMarca}
          onChange={(e) => setFiltroMarca(e.target.value)}
        >
          <option value="">Todas as marcas</option>
          {Object.entries(MARCA_LABEL).map(([valor, label]) => (
            <option key={valor} value={valor}>
              {label}
            </option>
          ))}
        </select>

        <select
          className="solar-input text-sm py-1.5 px-2"
          value={filtroCidade}
          onChange={(e) => setFiltroCidade(e.target.value)}
        >
          <option value="">Todas as cidades</option>
          {cidades.map((cidade) => (
            <option key={cidade} value={cidade}>
              {cidade}
            </option>
          ))}
        </select>

        {filtroEstado && (
          <button
            onClick={() => setFiltroEstado('')}
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            Limpar filtro de estado
          </button>
        )}
      </div>

      <div className="solar-card p-4">
        <p className="text-sm text-muted-foreground mb-3">
          {filtradas.length === 0
            ? 'Nenhuma usina encontrada com esses filtros.'
            : `${filtradas.length} de ${usinas.length} usina(s) ativa(s).`}
        </p>

        <div className="space-y-2">
          {filtradas.map((usina) => {
            const cfg = ESTADO_CONFIG[usina.estado_atual];
            const leitura = potencias.get(usina.id);
            const kwhPorKwpMedio = kwhPorKwp.get(usina.id);
            const expandida = usinaExpandida === usina.id;
            return (
              <div key={usina.id} className="rounded-lg border border-border bg-muted/30 overflow-hidden">
                <button
                  onClick={() => {
                    setUsinaExpandida(expandida ? null : usina.id);
                    setSubAbaExpandida('historico');
                  }}
                  className="w-full flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 text-left"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {expandida ? (
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    )}
                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {MARCA_LABEL[usina.marca] ?? usina.marca} — {usina.modelo || usina.sn_inversor || usina.id_externo}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                        {usina.cidade && (
                          <>
                            <MapPin className="w-3 h-3 shrink-0" /> {usina.cidade}
                          </>
                        )}
                        {usina.kwp ? ` • ${usina.kwp} kWp` : ''}
                        {kwhPorKwpMedio != null ? ` • ${kwhPorKwpMedio.toFixed(2)} kWh/kWp (30d)` : ''}
                        {leitura?.potencia_w != null ? ` • ${Math.round(leitura.potencia_w)} W agora` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.badge}`}
                    >
                      <cfg.icon className="w-3 h-3" /> {cfg.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatarHaQuanto(usina.estado_atualizado_em)}</span>
                  </div>
                </button>

                {expandida && (
                  <div className="px-3 pb-3 border-t border-border/50">
                    <div className="flex gap-1.5 pt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSubAbaExpandida('historico');
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                          subAbaExpandida === 'historico' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 hover:bg-muted'
                        }`}
                      >
                        Histórico
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSubAbaExpandida('fatura');
                        }}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${
                          subAbaExpandida === 'fatura' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 hover:bg-muted'
                        }`}
                      >
                        <Receipt className="w-3 h-3" /> Conta de luz
                      </button>
                    </div>
                    {subAbaExpandida === 'historico' ? <HistoricoUsina usinaId={usina.id} /> : <FaturaUsina usinaId={usina.id} />}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
