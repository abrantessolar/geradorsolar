import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
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
// Mostra duas coisas lado a lado, como pedido: a evolução diária de
// geração (kWh) e o desvio % em relação à mediana de kWh/kWp das
// usinas da mesma cidade naquele dia — populado pelo backfill manual
// (supabase/functions/mon-backfill-diario).

function formatarDataCurta(iso: string): string {
  const [, mes, dia] = iso.split('-');
  return `${dia}/${mes}`;
}

export default function HistoricoUsina({ usinaId }: { usinaId: string }) {
  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState<MonDiario[]>([]);

  useEffect(() => {
    let ativo = true;
    setLoading(true);
    listarDiarioUsina(usinaId)
      .then((d) => {
        if (ativo) setDados(d);
      })
      .catch((e: any) => toast.error('Erro ao carregar histórico: ' + e.message))
      .finally(() => {
        if (ativo) setLoading(false);
      });
    return () => {
      ativo = false;
    };
  }, [usinaId]);

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
        Sem histórico ainda pra essa usina — depende do backfill manual (ou da coleta diária, mais pra frente) ter
        rodado pra ela.
      </p>
    );
  }

  const pontos = dados.map((d) => ({
    data: formatarDataCurta(d.data),
    kwh: d.kwh ?? 0,
    desvio_pct: d.desvio_pct != null ? Math.round(d.desvio_pct * 10) / 10 : null,
  }));

  return (
    <div className="pt-2 space-y-1">
      <p className="text-xs text-muted-foreground px-1">
        Geração diária (kWh) e desvio % em relação à mediana das usinas da mesma cidade
      </p>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={pontos} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="data" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis yAxisId="kwh" tick={{ fontSize: 11 }} width={40} />
            <YAxis yAxisId="desvio" orientation="right" tick={{ fontSize: 11 }} width={40} unit="%" />
            <Tooltip
              formatter={(value: number, name: string) =>
                name === 'kwh' ? [`${value} kWh`, 'Geração'] : [`${value}%`, 'Desvio vs cidade']
              }
              labelFormatter={(label) => `Dia ${label}`}
            />
            <Legend
              formatter={(value) => (value === 'kwh' ? 'Geração (kWh)' : 'Desvio vs mediana da cidade (%)')}
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
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
