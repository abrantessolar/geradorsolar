import React, { useMemo } from 'react';
import type { Projeto } from '@/pages/GestorPage';
import { ClipboardList, Truck, Wrench, Clock, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts';

const STATUS_LIST = ['Vendido', 'Equipamento Comprado', 'Entregue', 'Em Instalação', 'Instalado', 'Projeto Submetido', 'Homologado'];
const COLORS = ['hsl(var(--primary))', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#6366f1'];

function daysSince(dateStr?: string): number {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

export default function GestorDashboard({ projetos, loading }: { projetos: Projeto[]; loading: boolean }) {
  const stats = useMemo(() => {
    const active = projetos.filter(p => p.status !== 'Homologado');
    const waitingInstall = projetos.filter(p => p.status === 'Entregue');
    const waitingHomolog = projetos.filter(p => p.status === 'Instalado');
    const withInstall = projetos.filter(p => p.data_instalacao && p.data_fechamento);
    const avgDays = withInstall.length > 0
      ? Math.round(withInstall.reduce((sum, p) => sum + daysSince(p.data_fechamento!) - daysSince(p.data_instalacao!), 0) / withInstall.length)
      : 0;
    return { active: active.length, waitingInstall: waitingInstall.length, waitingHomolog: waitingHomolog.length, avgDays };
  }, [projetos]);

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
    return Object.entries(months).map(([m, count]) => ({
      name: m.split('-').reverse().join('/'), count,
    }));
  }, [projetos]);

  const alerts = useMemo(() => {
    const withObjecoes = projetos.filter(p => p.objecoes && p.objecoes.trim() && p.status !== 'Homologado');
    const overdue = projetos.filter(p => !p.data_instalacao && daysSince(p.data_fechamento) > 60 && p.status !== 'Homologado');
    return { withObjecoes, overdue };
  }, [projetos]);

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Projetos Ativos', value: stats.active, icon: ClipboardList, color: 'text-primary' },
          { label: 'Aguardando Instalação', value: stats.waitingInstall, icon: Truck, color: 'text-amber-600' },
          { label: 'Aguardando Homologação', value: stats.waitingHomolog, icon: Wrench, color: 'text-blue-600' },
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
