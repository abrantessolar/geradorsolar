import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { listarDiarioUsina } from '../lib/diario';
import type { MonDiario } from '../types';

// Central de Monitoramento TLS — Fase 3: histórico diário de uma usina,
// aberto por clique dentro do Painel de saúde da frota (decisão do
// usuário: o histórico fica junto da usina, não numa aba separada).
// Mostra a evolução diária de geração (kWh, em barras) e o kWh/kWp
// (indicador de desempenho, normalizado por tamanho de sistema, em
// linha) — populado pelo backfill (FoxESS: mon-backfill-diario; Solis:
// mon-backfill-solis).
//
// 2026-10-17 — pedidos do usuário atendidos aqui:
// 1. Filtro de mês/ano (antes os dados vinham "corridos", sem separação),
//    com somatório do mês selecionado e do ano.
// 2. kWh/kWp como indicador de problema: mostrado como stat (média do
//    período).
// 3. Tentativas de comparação (mediana por cidade, depois mediana da
//    frota inteira) foram REMOVIDAS — o usuário não achou confiável.
//    Fica só o kWh/kWp bruto, sem comparação com nada (ver
//    drizzle/migrations/0011_remover_desvio_frota.sql).
// 4. Modo "período personalizado": além do mês-calendário, dá pra
//    escolher início/fim livres (ex.: pra bater com o período de
//    faturamento da distribuidora, que raramente coincide com o mês
//    civil) e ver o somatório + gráfico de barras daquele intervalo.

function formatarDataCurta(iso: string): string {
  const [, mes, dia] = iso.split('-');
  return `${dia}/${mes}`;
}

function chaveMes(iso: string): string {
  return iso.slice(0, 7); // "yyyy-mm"
}

const NOMES_MES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

function rotuloMes(chave: string): string {
  const [ano, mes] = chave.split('-');
  return `${NOMES_MES[Number(mes) - 1]}/${ano}`;
}

function subtrairDias(iso: string, dias: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - dias);
  return d.toISOString().slice(0, 10);
}

type Modo = 'mes' | 'periodo';

export default function HistoricoUsina({ usinaId }: { usinaId: string }) {
  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState<MonDiario[]>([]);
  const [modo, setModo] = useState<Modo>('mes');
  const [mesSelecionado, setMesSelecionado] = useState<string>(''); // "" = todos os meses
  const [periodoInicio, setPeriodoInicio] = useState<string>('');
  const [periodoFim, setPeriodoFim] = useState<string>('');

  useEffect(() => {
    let ativo = true;
    setLoading(true);
    listarDiarioUsina(usinaId)
      .then((d) => {
        if (ativo) {
          setDados(d);
          if (d.length > 0) {
            // Por padrão, abre no mês mais recente com dado (não "tudo
            // corrido") — é o pedido original do usuário.
            setMesSelecionado(chaveMes(d[d.length - 1].data));
            // Período personalizado abre, por padrão, nos últimos 30
            // dias com dado — ponto de partida razoável pra comparar
            // com uma fatura, que o usuário ajusta pras datas certas.
            const ultimaData = d[d.length - 1].data;
            setPeriodoFim(ultimaData);
            setPeriodoInicio(subtrairDias(ultimaData, 29));
          }
        }
      })
      .catch((e: any) => toast.error('Erro ao carregar histórico: ' + e.message))
      .finally(() => {
        if (ativo) setLoading(false);
      });
    return () => {
      ativo = false;
    };
  }, [usinaId]);

  const mesesDisponiveis = useMemo(() => {
    const chaves = Array.from(new Set(dados.map((d) => chaveMes(d.data))));
    return chaves.sort().reverse();
  }, [dados]);

  const anoSelecionado = mesSelecionado.slice(0, 4);

  const dadosDoMes = useMemo(
    () => (mesSelecionado ? dados.filter((d) => chaveMes(d.data) === mesSelecionado) : dados),
    [dados, mesSelecionado]
  );

  const dadosDoAno = useMemo(
    () => (anoSelecionado ? dados.filter((d) => d.data.slice(0, 4) === anoSelecionado) : dados),
    [dados, anoSelecionado]
  );

  const dadosDoPeriodo = useMemo(
    () => dados.filter((d) => (!periodoInicio || d.data >= periodoInicio) && (!periodoFim || d.data <= periodoFim)),
    [dados, periodoInicio, periodoFim]
  );

  const dadosExibidos = modo === 'periodo' ? dadosDoPeriodo : dadosDoMes;

  const somatorioMes = useMemo(() => dadosDoMes.reduce((acc, d) => acc + (d.kwh ?? 0), 0), [dadosDoMes]);
  const somatorioAno = useMemo(() => dadosDoAno.reduce((acc, d) => acc + (d.kwh ?? 0), 0), [dadosDoAno]);
  const somatorioPeriodo = useMemo(() => dadosDoPeriodo.reduce((acc, d) => acc + (d.kwh ?? 0), 0), [dadosDoPeriodo]);

  const kwhPorKwpMedio = useMemo(() => {
    const valores = dadosExibidos.map((d) => d.kwh_por_kwp).filter((v): v is number => v != null);
    if (valores.length === 0) return null;
    return valores.reduce((a, b) => a + b, 0) / valores.length;
  }, [dadosExibidos]);

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
      </div>
    );
  }

  if (dados.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-3">
        Sem histórico ainda pra essa usina — depende do backfill (ou da coleta diária) ter rodado pra ela.
      </p>
    );
  }

  const pontos = dadosExibidos.map((d) => ({
    data: formatarDataCurta(d.data),
    kwh: d.kwh ?? 0,
    kwh_por_kwp: d.kwh_por_kwp != null ? Math.round(d.kwh_por_kwp * 100) / 100 : null,
  }));

  return (
    <div className="pt-2 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-border overflow-hidden text-xs">
          <button
            onClick={() => setModo('mes')}
            className={`px-2.5 py-1 font-medium ${modo === 'mes' ? 'bg-primary text-primary-foreground' : 'bg-muted/40 hover:bg-muted/70'}`}
          >
            Por mês
          </button>
          <button
            onClick={() => setModo('periodo')}
            className={`px-2.5 py-1 font-medium ${modo === 'periodo' ? 'bg-primary text-primary-foreground' : 'bg-muted/40 hover:bg-muted/70'}`}
          >
            Período personalizado
          </button>
        </div>

        {modo === 'mes' ? (
          <select
            className="solar-input text-xs py-1 px-2"
            value={mesSelecionado}
            onChange={(e) => setMesSelecionado(e.target.value)}
          >
            {mesesDisponiveis.map((chave) => (
              <option key={chave} value={chave}>
                {rotuloMes(chave)}
              </option>
            ))}
            <option value="">Todo o histórico</option>
          </select>
        ) : (
          <div className="flex items-center gap-1.5 text-xs">
            <input
              type="date"
              className="solar-input text-xs py-1 px-1.5"
              value={periodoInicio}
              onChange={(e) => setPeriodoInicio(e.target.value)}
            />
            <span className="text-muted-foreground">até</span>
            <input
              type="date"
              className="solar-input text-xs py-1 px-1.5"
              value={periodoFim}
              onChange={(e) => setPeriodoFim(e.target.value)}
            />
          </div>
        )}

        <p className="text-xs text-muted-foreground">{dadosExibidos.length} dia(s) no período selecionado</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {modo === 'mes' ? (
          <>
            <div className="rounded-lg border border-border bg-muted/30 p-2">
              <p className="text-[11px] text-muted-foreground">Total do mês</p>
              <p className="text-sm font-semibold">{somatorioMes.toFixed(1)} kWh</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-2">
              <p className="text-[11px] text-muted-foreground">Total do ano ({anoSelecionado || '—'})</p>
              <p className="text-sm font-semibold">{somatorioAno.toFixed(1)} kWh</p>
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-border bg-muted/30 p-2 col-span-2">
            <p className="text-[11px] text-muted-foreground">Total do período (pra comparar com a fatura)</p>
            <p className="text-sm font-semibold">{somatorioPeriodo.toFixed(1)} kWh</p>
          </div>
        )}
        <div className="rounded-lg border border-border bg-muted/30 p-2">
          <p className="text-[11px] text-muted-foreground">kWh/kWp médio</p>
          <p className="text-sm font-semibold">{kwhPorKwpMedio != null ? kwhPorKwpMedio.toFixed(2) : '—'}</p>
        </div>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={pontos} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="data" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis yAxisId="kwh" tick={{ fontSize: 11 }} width={40} />
            <YAxis yAxisId="kwp" orientation="right" tick={{ fontSize: 11 }} width={40} />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === 'kwh') return [`${value} kWh`, 'Geração'];
                return [value, 'kWh/kWp'];
              }}
              labelFormatter={(label) => `Dia ${label}`}
            />
            <Legend
              formatter={(value) => (value === 'kwh' ? 'Geração (kWh)' : 'kWh/kWp')}
              wrapperStyle={{ fontSize: 12 }}
            />
            <Bar yAxisId="kwh" dataKey="kwh" fill="#16a34a" radius={[2, 2, 0, 0]} />
            <Line
              yAxisId="kwp"
              type="monotone"
              dataKey="kwh_por_kwp"
              stroke="#2563eb"
              dot={false}
              strokeWidth={2}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
