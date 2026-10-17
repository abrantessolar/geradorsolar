import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, RefreshCw, Siren, MapPin } from 'lucide-react';
import { listarHistoricoAlarmes, type EpisodioAlarme } from '../lib/alarmes';

// Central de Monitoramento TLS — histórico unificado de alarmes
// (2026-10-17, pedido do usuário: "unificar em um lugar o historico de
// alarmes"). Antes isso só existia espalhado dentro de `mon_leituras`,
// uma leitura por ciclo de coleta — aqui agrupamos leituras consecutivas
// com o mesmo alarme num só "episódio" (ver lib/alarmes.ts), pra não
// listar uma linha a cada ~20min enquanto o alarme persiste.

const MARCA_LABEL: Record<string, string> = {
  foxess: 'FoxESS',
  solarman: 'Solarman',
  solis: 'Solis',
  sofarcloud: 'SofarCloud',
  hoymiles: 'Hoymiles',
};

const PERIODOS = [
  { dias: 7, label: 'Últimos 7 dias' },
  { dias: 30, label: 'Últimos 30 dias' },
  { dias: 90, label: 'Últimos 90 dias' },
];

function formatarPeriodo(inicio: string, fim: string): string {
  const di = new Date(inicio);
  const df = new Date(fim);
  const fmt = (d: Date) => d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  if (inicio === fim) return fmt(di);
  return `${fmt(di)} → ${fmt(df)}`;
}

export default function HistoricoAlarmes() {
  const [loading, setLoading] = useState(true);
  const [episodios, setEpisodios] = useState<EpisodioAlarme[]>([]);
  const [dias, setDias] = useState(30);
  const [filtroMarca, setFiltroMarca] = useState<string>('');
  const [filtroCidade, setFiltroCidade] = useState<string>('');

  const carregar = async (d: number) => {
    setLoading(true);
    try {
      const lista = await listarHistoricoAlarmes(d);
      setEpisodios(lista);
    } catch (e: any) {
      toast.error('Erro ao carregar histórico de alarmes: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar(dias);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dias]);

  const cidades = useMemo(
    () => Array.from(new Set(episodios.map((e) => e.cidade).filter(Boolean))).sort() as string[],
    [episodios]
  );

  const filtrados = useMemo(
    () =>
      episodios
        .filter((e) => !filtroMarca || e.marca === filtroMarca)
        .filter((e) => !filtroCidade || e.cidade === filtroCidade),
    [episodios, filtroMarca, filtroCidade]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold text-primary flex items-center gap-2">
          <Siren className="w-5 h-5" /> Histórico de alarmes
        </h2>
        <button
          onClick={() => carregar(dias)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-muted hover:bg-muted/70"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Atualizar
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <select className="solar-input text-sm py-1.5 px-2" value={dias} onChange={(e) => setDias(Number(e.target.value))}>
          {PERIODOS.map((p) => (
            <option key={p.dias} value={p.dias}>
              {p.label}
            </option>
          ))}
        </select>
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
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="solar-card p-4">
          <p className="text-sm text-muted-foreground mb-3">
            {filtrados.length === 0
              ? 'Nenhum alarme no período selecionado.'
              : `${filtrados.length} episódio(s) de alarme no período.`}
          </p>
          <div className="space-y-2">
            {filtrados.map((ep, i) => (
              <div
                key={`${ep.usina_id}-${ep.inicio}-${i}`}
                className="rounded-lg border border-red-200 bg-red-50 p-3 flex flex-col sm:flex-row sm:items-center gap-2"
              >
                <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">
                    {MARCA_LABEL[ep.marca] ?? ep.marca} — {ep.modelo || ep.id_externo}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                    {ep.cidade && (
                      <>
                        <MapPin className="w-3 h-3 shrink-0" /> {ep.cidade} •
                      </>
                    )}
                    {formatarPeriodo(ep.inicio, ep.fim)} • {ep.ocorrencias} leitura(s)
                  </p>
                  <p className="text-xs text-red-700 mt-1">{ep.alarmes.join(' · ')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
