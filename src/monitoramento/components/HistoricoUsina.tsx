import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { listarDiarioUsina } from '../lib/diario';
import type { MonDiario } from '../types';

// Central de Monitoramento TLS — Fase 3: histórico diário de uma usina,
// aberto por clique dentro do Painel de saúde da frota (decisão do
// usuário: o histórico fica junto da usina, não numa aba separada).
// Mostra a evolução diária de geração (kWh) e o desvio % em relação à
// mediana de kWh/kWp da FROTA INTEIRA (todas as usinas, FoxESS + Solis,
// independente da cidade) naquele dia — populado pelo backfill (FoxESS:
// mon-backfill-diario; Solis: mon-backfill-solis) e recalculado por
// mon-recalcular-desvio.
//
// 2026-10-17 — pedidos do usuário atendidos aqui:
// 1. Filtro de mês/ano (antes os dados vinham "corridos", sem separação),
//    com somatório do mês selecionado e do ano.
// 2. kWh/kWp como indicador de problema: mostrado como stat (média do
//    período) e os dias marcados como baixo desempenho (desvio_pct < -30%)
//    ganham um ponto vermelho destacado no gráfico.
// 3. A comparação era por cidade (mediana_cidade) e quase nunca formava
//    grupo grande o suficiente pra significar algo — trocada pela mediana
//    da FROTA INTEIRA (ver drizzle/migrations/0010_mon_recalcular_desvio_global.sql
//    e supabase/functions/mon-recalcular-desvio). A coluna continua se
//    chamando `mediana_cidade` no banco por razões históricas, mas o valor
//    agora é da frota toda — daí o rótulo "mediana da frota" aqui.

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

export default function HistoricoUsina({ usinaId }: { usinaId: string }) {
  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState<MonDiario[]>([]);
  const [mesSelecionado, setMesSelecionado] = useState<string>(''); // "" = todos os meses

  useEffect(() => {
    let ativo = true;
    setLoading(true);
    listarDiarioUsina(usinaId)
      .then((d) => {
        if (ativo) {
          setDados(d);
          // Por padrão, abre no mês mais recente com dado (não "tudo
          // corrido") — é o pedido original do usuário.
          if (d.length > 0) setMesSelecionado(chaveMes(d[d.length - 1].data));
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

  const somatorioMes = useMemo(() => dadosDoMes.reduce((acc, d) => acc + (d.kwh ?? 0), 0), [dadosDoMes]);
  const somatorioAno = useMemo(() => dadosDoAno.reduce((acc, d) => acc + (d.kwh ?? 0), 0), [dadosDoAno]);

  const kwhPorKwpMedio = useMemo(() => {
    const valores = dadosDoMes.map((d) => d.kwh_por_kwp).filter((v): v is number => v != null);
    if (valores.length === 0) return null;
    return valores.reduce((a, b) => a + b, 0) / valores.length;
  }, [dadosDoMes]);

  const diasBaixoDesempenho = useMemo(
    () => dadosDoMes.filter((d) => d.estado === 'baixo_desempenho').length,
    [dadosDoMes]
  );

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

  const pontos = dadosDoMes.map((d) => ({
    data: formatarDataCurta(d.data),
    kwh: d.kwh ?? 0,
    desvio_pct: d.desvio_pct != null ? Math.round(d.desvio_pct * 10) / 10 : null,
    // ponto extra só nos dias de baixo desempenho, pra destacar no gráfico
    baixo_desempenho: d.estado === 'baixo_desempenho' ? d.kwh ?? 0 : null,
  }));

  return (
    <div className="pt-2 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
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
        <p className="text-xs text-muted-foreground">
          {dadosDoMes.length} dia(s) no período selecionado
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="rounded-lg border border-border bg-muted/30 p-2">
          <p className="text-[11px] text-muted-foreground">Total do mês</p>
          <p className="text-sm font-semibold">{somatorioMes.toFixed(1)} kWh</p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-2">
          <p className="text-[11px] text-muted-foreground">Total do ano ({anoSelecionado || '—'})</p>
          <p className="text-sm font-semibold">{somatorioAno.toFixed(1)} kWh</p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-2">
          <p className="text-[11px] text-muted-foreground">kWh/kWp médio no mês</p>
          <p className="text-sm font-semibold">{kwhPorKwpMedio != null ? kwhPorKwpMedio.toFixed(2) : '—'}</p>
        </div>
        <div className={`rounded-lg border p-2 ${diasBaixoDesempenho > 0 ? 'border-orange-200 bg-orange-50' : 'border-border bg-muted/30'}`}>
          <p className="text-[11px] text-muted-foreground">Dias de baixo desempenho</p>
          <p className={`text-sm font-semibold ${diasBaixoDesempenho > 0 ? 'text-orange-700' : ''}`}>{diasBaixoDesempenho}</p>
        </div>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={pontos} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="data" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis yAxisId="kwh" tick={{ fontSize: 11 }} width={40} />
            <YAxis yAxisId="desvio" orientation="right" tick={{ fontSize: 11 }} width={40} unit="%" />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === 'kwh') return [`${value} kWh`, 'Geração'];
                if (name === 'baixo_desempenho') return [`${value} kWh`, 'Baixo desempenho'];
                return [`${value}%`, 'Desvio vs frota'];
              }}
              labelFormatter={(label) => `Dia ${label}`}
            />
            <Legend
              formatter={(value) =>
                value === 'kwh'
                  ? 'Geração (kWh)'
                  : value === 'baixo_desempenho'
                  ? 'Baixo desempenho'
                  : 'Desvio vs mediana da frota (%)'
              }
              wrapperStyle={{ fontSize: 12 }}
            />
            <ReferenceLine yAxisId="desvio" y={0} stroke="#94a3b8" strokeDasharray="3 3" />
            <Line yAxisId="kwh" type="monotone" dataKey="kwh" stroke="#16a34a" dot={false} strokeWidth={2} />
            <Line
              yAxisId="desvio"
              type="monotone"
              dataKey="desvio_pct"
              stroke="#f97316"
              dot={false}
              strokeWidth={2}
              connectNulls
            />
            <Scatter yAxisId="kwh" dataKey="baixo_desempenho" fill="#dc2626" shape="circle" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {dadosDoMes.every((d) => d.mediana_cidade == null) && (
        <p className="text-[11px] text-muted-foreground">
          Comparação com a mediana da frota ainda não disponível pra essa usina neste período (depende do kWh/kWp
          estar calculado pra essa usina e de mon-recalcular-desvio já ter rodado) — o kWh/kWp acima é só a média
          bruta, sem indicador de baixo desempenho.
        </p>
      )}
    </div>
  );
}
