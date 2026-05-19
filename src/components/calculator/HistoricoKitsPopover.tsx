import { useEffect, useState } from 'react';
import { History, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  KitHistoryRow, KitInput, listKitsHistory, kitRowToInput, describeKitRow, timeAgo,
} from '@/data/kitHistory';
import { formatCurrency } from '@/data/calculations';

interface Props {
  onPick: (kit: KitInput) => void;
}

export default function HistoricoKitsPopover({ onPick }: Props) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<KitHistoryRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    listKitsHistory(30).then(r => {
      setRows(r);
      setLoading(false);
    });
  }, [open]);

  const filtered = rows.filter(r => {
    if (!search.trim()) return true;
    const s = search.trim().toUpperCase();
    return (
      r.marca_inversor.includes(s) ||
      r.modelo_inversor.includes(s) ||
      r.marca_placa.includes(s) ||
      r.modelo_placa.includes(s)
    );
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-secondary/20 text-secondary-foreground hover:bg-secondary/30 transition-colors"
        >
          <History className="w-3.5 h-3.5" />
          Kits usados anteriormente
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="end">
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar kit..."
              className="w-full pl-8 pr-2 py-1.5 text-xs rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>
        <div className="max-h-[360px] overflow-y-auto">
          {loading && <p className="p-4 text-xs text-center text-muted-foreground">Carregando...</p>}
          {!loading && filtered.length === 0 && (
            <p className="p-4 text-xs text-center text-muted-foreground">
              {rows.length === 0 ? 'Nenhum kit no histórico ainda.' : 'Nenhum kit encontrado.'}
            </p>
          )}
          {!loading && filtered.map(r => (
            <div key={r.id} className="p-3 border-b border-border/50 last:border-b-0 hover:bg-muted/30 transition-colors">
              <p className="text-xs font-medium leading-tight">{describeKitRow(r)}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Custo: {formatCurrency(Number(r.custo_kit))} • {timeAgo(r.usado_em)} • usado {r.vezes_usado}×
              </p>
              <button
                type="button"
                onClick={() => {
                  onPick(kitRowToInput(r));
                  setOpen(false);
                }}
                className="mt-1.5 text-[10px] px-2 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Usar este kit
              </button>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
