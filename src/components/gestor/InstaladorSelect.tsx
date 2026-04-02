import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { HardHat, Plus, X } from 'lucide-react';

type Instalador = { id: string; nome: string };

export default function InstaladorSelect({ projetoId, currentValue, onDone }: {
  projetoId: string;
  currentValue?: string | null;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [instaladores, setInstaladores] = useState<Instalador[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [newNome, setNewNome] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from('instaladores' as any).select('id, nome').eq('ativo', true).order('nome').then(({ data }) => {
      setInstaladores((data || []) as any);
    });
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = async (nome: string) => {
    const { error } = await supabase.from('projetos' as any).update({ instalador: nome }).eq('id', projetoId);
    if (error) toast.error(error.message);
    else { toast.success(`Instalador: ${nome}`); onDone(); }
    setOpen(false);
  };

  const addNew = async () => {
    if (!newNome.trim()) return;
    const { data, error } = await supabase.from('instaladores' as any).insert({ nome: newNome.trim().toUpperCase() }).select().single();
    if (error) { toast.error(error.message); return; }
    setInstaladores(prev => [...prev, data as any]);
    await select((data as any).nome);
    setNewNome('');
    setShowNew(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="inline-flex items-center gap-1 text-xs" title="Instalador">
        {currentValue ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-xs font-medium">
            <HardHat className="w-3 h-3" /> {currentValue}
          </span>
        ) : (
          <span className="text-muted-foreground hover:text-foreground">👷</span>
        )}
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-background border border-border rounded-lg shadow-lg py-1 min-w-[160px]">
          {instaladores.map(i => (
            <button key={i.id} onClick={() => select(i.nome)}
              className={`w-full text-left px-3 py-1.5 text-sm hover:bg-muted ${currentValue === i.nome ? 'bg-primary/10 font-medium' : ''}`}>
              {i.nome}
            </button>
          ))}
          {!showNew ? (
            <button onClick={() => setShowNew(true)} className="w-full text-left px-3 py-1.5 text-sm text-primary hover:bg-muted flex items-center gap-1">
              <Plus className="w-3 h-3" /> Novo instalador
            </button>
          ) : (
            <div className="px-2 py-1.5 flex gap-1">
              <input className="solar-input text-xs py-1 flex-1" placeholder="Nome" value={newNome} onChange={e => setNewNome(e.target.value)} onKeyDown={e => e.key === 'Enter' && addNew()} autoFocus />
              <button onClick={addNew} className="text-primary"><Plus className="w-4 h-4" /></button>
              <button onClick={() => setShowNew(false)} className="text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
