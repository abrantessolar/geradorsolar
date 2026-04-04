import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CustoObra, calcCustoTotal, calcLucroBruto, calcMargem, margemColor, fmt } from './types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';

type CustoComProjeto = CustoObra & {
  projetos?: { nome_completo: string | null; razao_social: string | null; data_instalacao: string | null; criado_em: string };
};

export default function CustosDashboard() {
  const [custos, setCustos] = useState<CustoComProjeto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('custos_obra' as any)
        .select('*, projetos!custos_obra_projeto_id_fkey(nome_completo, razao_social, data_instalacao, criado_em)');
      setCustos((data || []) as any[]);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="py-8 text-center text-muted-foreground">Carregando dashboard...</div>;

  const now = new Date();
  const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const custosMes = custos.filter(c => {
    const d = (c.projetos as any)?.data_instalacao || (c.projetos as any)?.criado_em?.slice(0, 10);
    return d?.startsWith(mesAtual);
  });

  const faturamentoMes = custosMes.reduce((s, c) => s + (c.preco_venda || 0), 0);
  const custoTotalMes = custosMes.reduce((s, c) => s + calcCustoTotal(c), 0);
  const lucroMes = faturamentoMes - custoTotalMes;
  const margemMedia = custosMes.length > 0
    ? custosMes.reduce((s, c) => s + calcMargem(c), 0) / custosMes.length
    : 0;

  // Evolução mensal (últimos 6 meses)
  const meses: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    meses.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const evolucao = meses.map(m => {
    const cm = custos.filter(c => {
      const d = (c.projetos as any)?.data_instalacao || (c.projetos as any)?.criado_em?.slice(0, 10);
      return d?.startsWith(m);
    });
    const fat = cm.reduce((s, c) => s + (c.preco_venda || 0), 0);
    const cst = cm.reduce((s, c) => s + calcCustoTotal(c), 0);
    return { mes: m.slice(5) + '/' + m.slice(2, 4), faturamento: fat, custos: cst, lucro: fat - cst };
  });

  // Pizza por centro de custo
  const centros = [
    { name: 'Kit', value: custosMes.reduce((s, c) => s + (c.custo_kit || 0), 0), color: '#3b82f6' },
    { name: 'Instalação', value: custosMes.reduce((s, c) => s + (c.custo_instalacao || 0), 0), color: '#f59e0b' },
    { name: 'Materiais', value: custosMes.reduce((s, c) => s + (c.custo_materiais || 0), 0), color: '#10b981' },
    { name: 'TRT', value: custosMes.reduce((s, c) => s + (c.custo_trt || 0), 0), color: '#8b5cf6' },
    { name: 'Frete', value: custosMes.reduce((s, c) => s + (c.custo_frete || 0), 0), color: '#ef4444' },
    { name: 'Outros', value: custosMes.reduce((s, c) => s + ((c.custo_homologacao || 0) + (c.custo_comissao || 0) + (c.custo_outros || 0)), 0), color: '#6b7280' },
  ].filter(c => c.value > 0);

  // Top margens
  const comMargem = custos.map(c => ({
    nome: (c.projetos as any)?.nome_completo || (c.projetos as any)?.razao_social || '—',
    margem: calcMargem(c),
    lucro: calcLucroBruto(c),
  })).sort((a, b) => b.margem - a.margem);

  const top5 = comMargem.slice(0, 5);
  const bottom5 = comMargem.slice(-5).reverse();

  return (
    <div className="space-y-4">
      {/* Cards resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Faturamento (mês)</p>
            <p className="text-lg font-bold">{fmt(faturamentoMes)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Custo Total (mês)</p>
            <p className="text-lg font-bold text-destructive">{fmt(custoTotalMes)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Lucro Bruto (mês)</p>
            <p className={`text-lg font-bold ${lucroMes >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(lucroMes)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Margem Média</p>
            <p className={`text-lg font-bold ${margemColor(margemMedia)}`}>{margemMedia.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="p-3 pb-0"><CardTitle className="text-sm">Evolução Mensal (6 meses)</CardTitle></CardHeader>
          <CardContent className="p-3">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={evolucao}>
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Line type="monotone" dataKey="faturamento" stroke="#3b82f6" name="Faturamento" strokeWidth={2} />
                <Line type="monotone" dataKey="custos" stroke="#ef4444" name="Custos" strokeWidth={2} />
                <Line type="monotone" dataKey="lucro" stroke="#10b981" name="Lucro" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-3 pb-0"><CardTitle className="text-sm">Custos por Centro (mês)</CardTitle></CardHeader>
          <CardContent className="p-3">
            {centros.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={centros} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 10 }}>
                    {centros.map((c, i) => <Cell key={i} fill={c.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">Sem dados no mês</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cards centro de custo */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {[
          { icon: '💼', label: 'Kit', val: custosMes.reduce((s, c) => s + (c.custo_kit || 0), 0) },
          { icon: '🔧', label: 'Instalação', val: custosMes.reduce((s, c) => s + (c.custo_instalacao || 0), 0) },
          { icon: '📦', label: 'Materiais', val: custosMes.reduce((s, c) => s + (c.custo_materiais || 0), 0) },
          { icon: '📋', label: 'TRT', val: custosMes.reduce((s, c) => s + (c.custo_trt || 0), 0) },
          { icon: '🚚', label: 'Frete', val: custosMes.reduce((s, c) => s + (c.custo_frete || 0), 0) },
          { icon: '📎', label: 'Outros', val: custosMes.reduce((s, c) => s + ((c.custo_homologacao || 0) + (c.custo_comissao || 0) + (c.custo_outros || 0)), 0) },
        ].map(c => (
          <Card key={c.label}>
            <CardContent className="p-2 text-center">
              <p className="text-lg">{c.icon}</p>
              <p className="text-[10px] text-muted-foreground">{c.label}</p>
              <p className="text-xs font-bold">{fmt(c.val)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Top margens */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="p-3 pb-0"><CardTitle className="text-sm text-green-600">🏆 Top 5 Melhores Margens</CardTitle></CardHeader>
          <CardContent className="p-3">
            {top5.length === 0 ? <p className="text-sm text-muted-foreground">Sem dados</p> : (
              <div className="space-y-1">
                {top5.map((t, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span>{t.nome}</span>
                    <span className={margemColor(t.margem)}>{t.margem.toFixed(1)}% ({fmt(t.lucro)})</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 pb-0"><CardTitle className="text-sm text-red-600">⚠️ 5 Piores Margens</CardTitle></CardHeader>
          <CardContent className="p-3">
            {bottom5.length === 0 ? <p className="text-sm text-muted-foreground">Sem dados</p> : (
              <div className="space-y-1">
                {bottom5.map((t, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span>{t.nome}</span>
                    <span className={margemColor(t.margem)}>{t.margem.toFixed(1)}% ({fmt(t.lucro)})</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
