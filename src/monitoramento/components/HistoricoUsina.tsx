import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
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
// Mostra a evolução diária de geração (kWh) e o kWh/kWp (indicador de
// desempenho, normalizado por tamanho de sistema) — populado pelo
// backfill (FoxESS: mon-backfill-diario; Solis: mon-backfill-solis).
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
    kwh_por_kwp: d.kwh_por_kwp != null ? Math.round(d.kwh_por_kwp * 100) / 100 : null,
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

      <div className="grid grid-cols-3 gap-2">
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
            <Line yAxisId="kwh" type="monotone" dataKey="kwh" stroke="#16a34a" dot={false} strokeWidth={2} />
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
