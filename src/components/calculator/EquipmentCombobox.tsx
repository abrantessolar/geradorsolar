import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Plus, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export type EquipKind = 'inversor-string' | 'inversor-micro' | 'placa';

interface Item { id: string; marca: string; modelo: string; potencia: number; }

interface Props {
  kind: EquipKind;
  potencia: number; // kW para inversor, Wp para placa
  marca: string;
  modelo: string;
  onPick: (marca: string, modelo: string) => void;
  disabled?: boolean;
}

const TOL = 0.01;

export default function EquipmentCombobox({ kind, potencia, marca, modelo, onPick, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);

  const isInverter = kind !== 'placa';
  const tipo = kind === 'inversor-micro' ? 'Micro' : kind === 'inversor-string' ? 'String' : null;

  const load = async () => {
    setLoading(true);
    try {
      if (isInverter) {
        const { data } = await supabase
          .from('equipamentos_inversores')
          .select('id, marca, modelo, potencia_kw, tipo')
          .eq('ativo', true)
          .eq('tipo', tipo!)
          .order('marca');
        setItems((data || []).map(d => ({ id: d.id, marca: d.marca, modelo: d.modelo, potencia: Number(d.potencia_kw) })));
      } else {
        const { data } = await supabase
          .from('equipamentos_placas')
          .select('id, marca, modelo, potencia_wp')
          .eq('ativo', true)
          .order('marca');
        setItems((data || []).map(d => ({ id: d.id, marca: d.marca, modelo: d.modelo, potencia: Number(d.potencia_wp) })));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (open) load(); /* eslint-disable-next-line */ }, [open, kind]);

  const filtered = useMemo(() => {
    const byPower = potencia > 0
      ? items.filter(i => Math.abs(i.potencia - potencia) < TOL)
      : items;
    if (!query.trim()) return byPower;
    const q = query.toLowerCase();
    return byPower.filter(i =>
      i.marca.toLowerCase().includes(q) || i.modelo.toLowerCase().includes(q)
    );
  }, [items, potencia, query]);

  const label = marca || modelo
    ? `${marca}${marca && modelo ? ' · ' : ''}${modelo}`
    : 'Selecione marca / modelo';

  const handlePick = (it: Item) => {
    onPick(it.marca, it.modelo);
    setOpen(false);
    setQuery('');
  };

  const handleAddNew = async () => {
    const parts = query.trim().split(/\s+/);
    if (parts.length < 2) {
      toast.error('Digite "Marca Modelo" para cadastrar (ex: SOFAR KTLM-G3)');
      return;
    }
    if (potencia <= 0) {
      toast.error(`Informe a potência (${isInverter ? 'kW' : 'Wp'}) antes de cadastrar`);
      return;
    }
    const newMarca = parts[0].toUpperCase();
    const newModelo = parts.slice(1).join(' ');
    setSaving(true);
    try {
      if (isInverter) {
        const { error } = await supabase.from('equipamentos_inversores').insert({
          marca: newMarca, modelo: newModelo, potencia_kw: potencia, tipo: tipo!, ativo: true,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('equipamentos_placas').insert({
          marca: newMarca, modelo: newModelo, potencia_wp: potencia, ativo: true,
        });
        if (error) throw error;
      }
      toast.success('Cadastrado!');
      onPick(newMarca, newModelo);
      await load();
      setOpen(false);
      setQuery('');
    } catch (e: any) {
      toast.error('Erro: ' + (e?.message || 'falha ao cadastrar'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          disabled={disabled}
          className="w-full justify-between solar-input text-sm py-2 h-auto font-normal"
        >
          <span className={cn('truncate', !marca && !modelo && 'text-muted-foreground')}>{label}</span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0 z-50" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={potencia > 0
              ? `Buscar ${isInverter ? `${potencia} kW` : `${potencia} Wp`}...`
              : 'Defina a potência primeiro...'}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {loading && (
              <div className="flex items-center justify-center py-4 text-xs text-muted-foreground gap-2">
                <Loader2 className="w-3 h-3 animate-spin" /> Carregando...
              </div>
            )}
            {!loading && (
              <>
                <CommandEmpty>
                  <div className="py-3 text-xs text-muted-foreground">
                    Nenhum encontrado.
                    {query.trim() && potencia > 0 && (
                      <div className="mt-2">
                        <Button size="sm" variant="default" onClick={handleAddNew} disabled={saving}>
                          {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
                          Cadastrar "{query.trim()}" ({isInverter ? `${potencia} kW` : `${potencia} Wp`})
                        </Button>
                      </div>
                    )}
                  </div>
                </CommandEmpty>
                {filtered.length > 0 && (
                  <CommandGroup heading={potencia > 0 ? `Compatíveis (${isInverter ? `${potencia} kW` : `${potencia} Wp`})` : 'Todos'}>
                    {filtered.slice(0, 50).map(it => {
                      const isSel = it.marca === marca && it.modelo === modelo;
                      return (
                        <CommandItem key={it.id} value={it.id} onSelect={() => handlePick(it)}>
                          <Check className={cn('mr-2 h-3.5 w-3.5', isSel ? 'opacity-100' : 'opacity-0')} />
                          <span className="font-medium">{it.marca}</span>
                          <span className="ml-1 text-muted-foreground">{it.modelo}</span>
                          <span className="ml-auto text-[10px] text-muted-foreground">
                            {isInverter ? `${it.potencia} kW` : `${it.potencia} Wp`}
                          </span>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
          {/* Footer sempre visível: cadastrar novo */}
          <div className="p-2 border-t bg-muted/30">
            {potencia <= 0 ? (
              <p className="text-[11px] text-muted-foreground px-1">
                Informe a potência ({isInverter ? 'kW' : 'Wp'}) para cadastrar
              </p>
            ) : !query.trim() ? (
              <p className="text-[11px] text-muted-foreground px-1">
                Digite <span className="font-semibold">Marca Modelo</span> acima para cadastrar novo
              </p>
            ) : (
              <Button
                size="sm"
                variant="default"
                className="w-full justify-center text-xs h-8"
                onClick={handleAddNew}
                disabled={saving}
              >
                {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
                Cadastrar "{query.trim()}" ({isInverter ? `${potencia} kW` : `${potencia} Wp`})
              </Button>
            )}
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
