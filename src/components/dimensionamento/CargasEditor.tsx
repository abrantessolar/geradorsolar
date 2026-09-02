import { Plus, Trash2 } from 'lucide-react';
import { Carga, CARGAS_SUGERIDAS, novaCarga } from '@/lib/dimensionamento';

interface CargasEditorProps {
  cargas: Carga[];
  onChange: (cargas: Carga[]) => void;
}

export default function CargasEditor({ cargas, onChange }: CargasEditorProps) {
  const addCarga = (base?: Omit<Carga, 'id'>) => {
    const carga = base ? { ...novaCarga(), ...base } : novaCarga();
    onChange([...cargas, carga]);
  };

  const updateCarga = (id: string, field: keyof Omit<Carga, 'id'>, value: string) => {
    onChange(
      cargas.map(c => {
        if (c.id !== id) return c;
        if (field === 'nome') return { ...c, nome: value };
        const num = parseFloat(value.replace(',', '.')) || 0;
        return { ...c, [field]: num };
      })
    );
  };

  const removeCarga = (id: string) => {
    onChange(cargas.filter(c => c.id !== id));
  };

  const jaAdicionada = (nome: string) => cargas.some(c => c.nome === nome);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1.5">Equipamentos sugeridos</label>
        <div className="flex flex-wrap gap-2">
          {CARGAS_SUGERIDAS.map(sug => (
            <button
              key={sug.nome}
              type="button"
              disabled={jaAdicionada(sug.nome)}
              onClick={() => addCarga(sug)}
              className="text-xs px-3 py-1.5 rounded-full border border-input bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              + {sug.nome}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {cargas.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum equipamento adicionado ainda.</p>
        )}
        {cargas.map(c => (
          <div key={c.id} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-card">
            <input
              type="text"
              value={c.nome}
              onChange={e => updateCarga(c.id, 'nome', e.target.value)}
              placeholder="Nome do equipamento"
              className="flex-[2] min-w-0 px-2 py-1.5 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <input
              type="number"
              inputMode="decimal"
              value={c.potenciaW || ''}
              onChange={e => updateCarga(c.id, 'potenciaW', e.target.value)}
              placeholder="Watts"
              className="w-20 px-2 py-1.5 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <span className="text-xs text-muted-foreground">W ×</span>
            <input
              type="number"
              inputMode="decimal"
              value={c.horasDia || ''}
              onChange={e => updateCarga(c.id, 'horasDia', e.target.value)}
              placeholder="h/dia"
              className="w-16 px-2 py-1.5 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <span className="text-xs text-muted-foreground">h/dia</span>
            <button
              type="button"
              onClick={() => removeCarga(c.id)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              aria-label="Remover"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => addCarga()}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        <Plus className="w-4 h-4" /> Adicionar equipamento
      </button>
    </div>
  );
}
