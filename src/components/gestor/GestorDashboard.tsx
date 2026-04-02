import React, { useMemo } from 'react';
import type { Projeto } from '@/pages/GestorPage';
import { ClipboardList, Truck, Wrench, Clock, AlertTriangle, Snowflake, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import WhatsAppLink from './WhatsAppLink';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const STATUS_LIST = ['Vendido', 'Equipamento Comprado', 'Entregue', 'Em Instalação', 'Instalado', 'Projeto Submetido', 'Homologado'];
const COLORS = ['hsl(var(--primary))', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#6366f1'];

function daysSince(dateStr?: string): number {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

export default function GestorDashboard({ projetos, loading, onRefresh }: { projetos: Projeto[]; loading: boolean; onRefresh: () => void }) {
  const activeNonFrozen = useMemo(() => projetos.filter(p => !p.congelado && p.status !== 'Homologado'), [projetos]);
  const frozen = useMemo(() => projetos.filter(p => p.congelado), [projetos]);

  const stats = useMemo(() => {
    const active = activeNonFrozen;
    const waitingInstall = active.filter(p => p.status === 'Entregue');
    const waitingHomolog = active.filter(p => p.status === 'Instalado');
    const totalPlacasPendentes = active.reduce((sum, p) => sum + (p.qtd_placas || 0), 0);

    // Tempo médio entre venda e instalação (projetos já instalados de todos os projetos incluindo congelados)
    const allWithDates = projetos.filter(p => p.data_instalacao && p.data_fechamento);
    const avgDays = allWithDates.length > 0
      ? Math.round(allWithDates.reduce((sum, p) => {
          const fechamento = new Date(p.data_fechamento!).getTime();
          const instalacao = new Date(p.data_instalacao!).getTime();
          return sum + Math.abs(instalacao - fechamento) / (1000 * 60 * 60 * 24);
        }, 0) / allWithDates.length)
      : 0;

    return { active: active.length, waitingInstall: waitingInstall.length, waitingHomolog: waitingHomolog.length, avgDays, totalPlacasPendentes };
  }, [projetos, activeNonFrozen]);

  // Próximos clientes (maior tempo decorrido)
  const proximosClientes = useMemo(() => {
    return activeNonFrozen
      .filter(p => p.data_fechamento)
      .sort((a, b) => daysSince(a.data_fechamento) - daysSince(b.data_fechamento))
      .reverse()
      .slice(0, 5);
  }, [activeNonFrozen]);

  // Próximas instalações sugeridas
  const proximasInstalacoes = useMemo(() => {
    return activeNonFrozen
      .filter(p => p.data_fechamento && !p.data_instalacao)
      .sort((a, b) => daysSince(a.data_fechamento) - daysSince(b.data_fechamento))
      .reverse()
      .slice(0, 5);
  }, [activeNonFrozen]);

  const statusData = useMemo(() => STATUS_LIST.map(s => ({
    name: s, count: projetos.filter(p => p.status === s).length,
  })), [projetos]);

  const concData = useMemo(() => {
    const map: Record<string, number> = {};
    projetos.forEach(p => { map[p.concessionaria] = (map[p.concessionaria] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [projetos]);

  const monthlyData = useMemo(() => {
    const months: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months[key] = 0;
    }
    projetos.forEach(p => {
      if (p.data_fechamento) {
        const key = p.data_fechamento.substring(0, 7);
        if (key in months) months[key]++;
      }
    });
    return Object.entries(months).map(([m, count]) => ({ name: m.split('-').reverse().join('/'), count }));
  }, [projetos]);

  const alerts = useMemo(() => {
    const withObjecoes = activeNonFrozen.filter(p => p.objecoes && p.objecoes.trim());
    const overdue = activeNonFrozen.filter(p => !p.data_instalacao && daysSince(p.data_fechamento) > 60);
    return { withObjecoes, overdue };
  }, [activeNonFrozen]);

  const handleDescongelar = async (id: string) => {
    const { error } = await supabase.from('projetos' as any).update({
      congelado: false, congelado_ate: null, motivo_congelamento: null,
    }).eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Obra descongelada!'); onRefresh(); }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Projetos Ativos', value: stats.active, icon: ClipboardList, color: 'text-primary' },
          { label: 'Aguardando Instalação', value: stats.waitingInstall, icon: Truck, color: 'text-amber-600' },
          { label: 'Placas Pendentes', value: stats.totalPlacasPendentes, icon: BarChart3, color: 'text-blue-600' },
          { label: 'Aguardando Homologação', value: stats.waitingHomolog, icon: Wrench, color: 'text-emerald-600' },
          { label: 'Tempo Médio (dias)', value: stats.avgDays, icon: Clock, color: 'text-muted-foreground' },
        ].map(c => (
          <div key={c.label} className="solar-card p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center ${c.color}`}>
              <c.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{c.value}</p>
              <p className="text-xs text-muted-foreground">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Próximos clientes + Próximas instalações */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="solar-card p-4">
          <h3 className="text-sm font-semibold mb-3">📞 Próximos Clientes (maior tempo)</h3>
          {proximosClientes.length === 0 ? <p className="text-xs text-muted-foreground">Nenhum</p> : (
            <ul className="space-y-2">
              {proximosClientes.map(p => (
                <li key={p.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium truncate max-w-[200px]">{p.nome_completo || p.razao_social}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{daysSince(p.data_fechamento)}d</span>
                    <WhatsAppLink phone={p.telefone} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="solar-card p-4">
          <h3 className="text-sm font-semibold mb-3">🔧 Próximas Instalações Sugeridas</h3>
          {proximasInstalacoes.length === 0 ? <p className="text-xs text-muted-foreground">Nenhuma</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="py-1 px-1 text-left">Cliente</th>
                    <th className="py-1 px-1 text-left">Telefone</th>
                    <th className="py-1 px-1">Placas</th>
                    <th className="py-1 px-1">Tempo</th>
                    <th className="py-1 px-1 text-left">Instalador</th>
                  </tr>
                </thead>
                <tbody>
                  {proximasInstalacoes.map(p => (
                    <tr key={p.id} className="border-b border-border/30">
                      <td className="py-1.5 px-1 font-medium truncate max-w-[140px]">{p.nome_completo || p.razao_social}</td>
                      <td className="py-1.5 px-1"><WhatsAppLink phone={p.telefone} /></td>
                      <td className="py-1.5 px-1 text-center">{p.qtd_placas || '—'}</td>
                      <td className="py-1.5 px-1 text-center font-medium">{daysSince(p.data_fechamento)}d</td>
                      <td className="py-1.5 px-1">{p.instalador || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Obras Congeladas */}
      {frozen.length > 0 && (
        <div className="solar-card p-4 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Snowflake className="w-4 h-4 text-blue-500" /> Obras Congeladas ({frozen.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-1 px-2 text-left">Cliente</th>
                  <th className="py-1 px-2 text-left">Motivo</th>
                  <th className="py-1 px-2">Descongela em</th>
                  <th className="py-1 px-2">Ação</th>
                </tr>
              </thead>
              <tbody>
                {frozen.map(p => (
                  <tr key={p.id} className="border-b border-border/30">
                    <td className="py-1.5 px-2 font-medium">{p.nome_completo || p.razao_social}</td>
                    <td className="py-1.5 px-2 text-muted-foreground">{p.motivo_congelamento || '—'}</td>
                    <td className="py-1.5 px-2 text-center">{p.congelado_ate ? new Date(p.congelado_ate).toLocaleDateString('pt-BR') : '—'}</td>
                    <td className="py-1.5 px-2 text-center">
                      <button onClick={() => handleDescongelar(p.id)} className="text-xs text-blue-600 hover:underline">Descongelar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="solar-card p-4">
          <h3 className="text-sm font-semibold mb-3">Projetos por Status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={statusData}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="solar-card p-4">
          <h3 className="text-sm font-semibold mb-3">Por Concessionária</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={concData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {concData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="solar-card p-4">
        <h3 className="text-sm font-semibold mb-3">Fechamentos por Mês (últimos 6 meses)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Alerts */}
      {(alerts.withObjecoes.length > 0 || alerts.overdue.length > 0) && (
        <div className="solar-card p-4 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> Lista de Atenção</h3>
          {alerts.overdue.length > 0 && (
            <div>
              <p className="text-xs font-medium text-destructive mb-1">Projetos com mais de 60 dias sem instalação:</p>
              <ul className="text-xs space-y-1">
                {alerts.overdue.map(p => (
                  <li key={p.id} className="text-destructive">• {p.nome_completo || p.razao_social} — {daysSince(p.data_fechamento)} dias</li>
                ))}
              </ul>
            </div>
          )}
          {alerts.withObjecoes.length > 0 && (
            <div>
              <p className="text-xs font-medium text-amber-600 mb-1">Projetos com objeções pendentes:</p>
              <ul className="text-xs space-y-1">
                {alerts.withObjecoes.map(p => (
                  <li key={p.id} className="text-amber-700">• {p.nome_completo || p.razao_social}: {p.objecoes?.substring(0, 80)}...</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
