import { Link } from 'react-router-dom';
import { Calculator, Wrench, ChevronRight, Sun, BatteryCharging, Waves } from 'lucide-react';

const tools = [
  {
    to: '/ferramentas/ren1000',
    icon: Calculator,
    title: 'Calculadora REN 1000',
    desc: 'Calcula a potência máxima de inversor permitida pela norma REN 1000',
  },
  {
    to: '/ferramentas/offgrid',
    icon: Sun,
    title: 'Dimensionamento Offgrid',
    desc: 'Placas + bateria a partir da lista de cargas e autonomia em dias',
  },
  {
    to: '/ferramentas/backup',
    icon: BatteryCharging,
    title: 'Dimensionamento de Backup',
    desc: 'Bateria do circuito de emergência (horas ou dias)',
  },
  {
    to: '/ferramentas/bombeamento',
    icon: Waves,
    title: 'Dimensionamento de Bombeamento',
    desc: 'Placas solares para bomba, por CV',
  },
];

export default function FerramentasPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Wrench className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ferramentas</h1>
          <p className="text-sm text-muted-foreground">Utilitários de apoio ao dimensionamento e vendas</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {tools.map(tool => (
          <Link
            key={tool.to}
            to={tool.to}
            className="group flex items-start gap-4 p-5 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all"
          >
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <tool.icon className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-foreground flex items-center gap-1">
                {tool.title}
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </h2>
              <p className="text-sm text-muted-foreground mt-1">{tool.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
