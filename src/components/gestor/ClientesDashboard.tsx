import React, { useMemo } from 'react';
import type { Projeto } from '@/pages/GestorPage';
import type { ClienteBase } from './ClientesList';
import { ClipboardList, Truck, Clock, AlertTriangle, Snowflake, BarChart3, CheckCircle } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, Legend } from 'recharts';
import WhatsAppLink from './WhatsAppLink';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { fmtDateBR } from '@/lib/dateUtils';

function daysSince(dateStr?: string | null): number {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function calcKwp(qtd?: number, potW?: string): number {
  if (!qtd || !potW) return 0;
  const pot = parseFloat(potW);
  if (isNaN(pot)) return 0;
  return (qtd * pot) / 1000;
}

const PIE_COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4'];

export default function ClientesDashboard({
  projetos, clientes, loading, onRefresh,
}: {
  projetos: Projeto[];
  clientes: ClienteBase[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const activeNonFrozen = useMemo(() => projetos.filter(p => !p.congelado), [projetos]);
  const frozen = useMemo(() => projetos.filter(p => p.congelado), [projetos]);

  const stats = useMemo(() => {
    const waitingInstall = activeNonFrozen.filter(p => p.status === 'Entregue');
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const instaladosEsteMes = clientes.filter(c => {
      if (!c.instalado_em) return false;
      return String(c.instalado_em).substring(0, 7) === thisMonth;
    }).length;

    const kwpPendente = activeNonFrozen.reduce((sum, p) => sum + calcKwp(p.qtd_placas, p.potencia_placa), 0);

    const allWithDates = [...projetos].filter(p => p.data_instalacao && p.data_fechamento);
    const avgDays = allWithDates.length > 0
      ? Math.round(allWithDates.reduce((sum, p) => {
          return sum + Math.abs(new Date(p.data_instalacao!).getTime() - new Date(p.data_fechamento!).getTime()) / (1000 * 60 * 60 * 24);
        }, 0) / allWithDates.length)
      : 0;

    const atrasados = activeNonFrozen.filter(p => !p.data_instalacao && daysSince(p.data_fechamento) > 30);

    return {
      totalAtivos: projetos.length,
      aguardando: waitingInstall.length,
      instaladosEsteMes,
      kwpPendente: kwpPendente.toFixed(1),
      tempoMedio: avgDays,
      atrasados: atrasados.length,
    };
  }, [projetos, clientes, activeNonFrozen]);

  // Instalações por mês (últimos 6)
  const monthlyInstall = useMemo(() => {
    const months: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`] = 0;
    }
    clientes.forEach(c => {
      if (c.instalado_em) {
        const key = String(c.instalado_em).substring(0, 7);
        if (key in months) months[key]++;
      }
    });
    return Object.entries(months).map(([m, count]) => ({ name: m.split('-').reverse().join('/'), count }));
  }, [clientes]);

  // Projetos por instalador
  const byInstalador = useMemo(() => {
    const map: Record<string, number> = {};
    projetos.forEach(p => {
      const inst = p.instalador || 'Sem instalador';
      map[inst] = (map[inst] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [projetos]);

  // Projetos por status
  const byStatus = useMemo(() => {
    const map: Record<string, number> = {};
    projetos.forEach(p => { map[p.status] = (map[p.status] || 0) + 1; });
    // Also count installed clients
    if (clientes.length > 0) map['Instalado'] = (map['Instalado'] || 0) + clientes.filter(c => c.instalado_em).length;
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [projetos, clientes]);

  // Próximos a instalar
  const proximosClientes = useMemo(() => {
    return activeNonFrozen
      .filter(p => p.data_fechamento)
      .sort((a, b) => daysSince(b.data_fechamento) - daysSince(a.data_fechamento))
      .slice(0, 15);
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
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Projetos Ativos', value: stats.totalAtivos, icon: ClipboardList, color: 'text-primary' },
          { label: 'Aguardando', value: stats.aguardando, icon: Truck, color: 'text-amber-600' },
          { label: 'Instalados (mês)', value: stats.instaladosEsteMes, icon: CheckCircle, color: 'text-green-600' },
          { label: 'kWp Pendente', value: stats.kwpPendente, icon: BarChart3, color: 'text-blue-600' },
          { label: 'Tempo Médio', value: `${stats.tempoMedio}d`, icon: Clock, color: 'text-muted-foreground' },
          { label: 'Atrasados (>30d)', value: stats.atrasados, icon: AlertTriangle, color: 'text-destructive' },
        ].map(c => (
          <div key={c.label} className="solar-card p-3 sm:p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0 ${c.color}`}>
              <c.icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-lg sm:text-xl font-bold leading-tight">{c.value}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Instalações por mês */}
        <div className="solar-card p-4">
          <h3 className="text-sm font-semibold mb-3">📊 Instalações por Mês</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyInstall}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={11} />
              <YAxis allowDecimals={false} fontSize={11} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Projetos por instalador */}
        <div className="solar-card p-4">
          <h3 className="text-sm font-semibold mb-3">👷 Projetos por Instalador</h3>
          {byInstalador.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={byInstalador} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`} fontSize={10}>
                  {byInstalador.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-xs text-muted-foreground text-center py-8">Sem dados</p>}
        </div>

        {/* Projetos por status */}
        <div className="solar-card p-4">
          <h3 className="text-sm font-semibold mb-3">📋 Projetos por Status</h3>
          {byStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} label={({ name, value }) => `${name}: ${value}`} fontSize={10}>
                  {byStatus.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-xs text-muted-foreground text-center py-8">Sem dados</p>}
        </div>

        {/* Fechamentos por mês */}
        <div className="solar-card p-4">
          <h3 className="text-sm font-semibold mb-3">📈 Fechamentos por Mês</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyInstall}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={11} />
              <YAxis allowDecimals={false} fontSize={11} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Próximos a instalar */}
      <div className="solar-card p-4">
        <h3 className="text-sm font-semibold mb-3">📞 Próximos a Instalar (maior tempo de espera)</h3>
        {proximosClientes.length === 0 ? <p className="text-xs text-muted-foreground">Nenhum</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-1 px-2 text-left">Cliente</th>
                  <th className="py-1 px-2 text-left">Telefone</th>
                  <th className="py-1 px-2 text-center">Placas</th>
                  <th className="py-1 px-2 text-center">KWp</th>
                  <th className="py-1 px-2 text-center">Dias</th>
                </tr>
              </thead>
              <tbody>
                {proximosClientes.map(p => (
                  <tr key={p.id} className="border-b border-border/30">
                    <td className="py-1.5 px-2 font-medium truncate max-w-[200px]">{p.nome_completo || p.razao_social}</td>
                    <td className="py-1.5 px-2"><WhatsAppLink phone={p.telefone} /></td>
                    <td className="py-1.5 px-2 text-center">{p.qtd_placas || '—'}</td>
                    <td className="py-1.5 px-2 text-center">{calcKwp(p.qtd_placas, p.potencia_placa).toFixed(2)}</td>
                    <td className={`py-1.5 px-2 text-center font-medium ${daysSince(p.data_fechamento) > 30 ? 'text-destructive' : ''}`}>{daysSince(p.data_fechamento)}d</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Obras congeladas */}
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
                    <td className="py-1.5 px-2 text-center">{p.congelado_ate ? fmtDateBR(p.congelado_ate) : '—'}</td>
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
    </div>
  );
}
