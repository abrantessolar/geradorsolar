import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FAQ_SETORES, getSetor, type FaqItem } from '@/lib/faqSetores';
import { Search, ChevronDown, Loader2 } from 'lucide-react';

interface Props {
  /** 'cliente' = link de acompanhamento; 'site' = página pública /faq */
  contexto: 'cliente' | 'site';
  /** Mostrar campo de busca por palavra-chave */
  busca?: boolean;
}

export default function FaqSection({ contexto, busca = false }: Props) {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [setor, setSetor] = useState<string>('todos');
  const [query, setQuery] = useState('');
  const [aberta, setAberta] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let q = supabase
        .from('faq')
        .select('id, setor, pergunta, resposta, visivel_cliente, visivel_site, ativo, ordem')
        .eq('ativo', true)
        .order('ordem')
        .order('criado_em');
      q = contexto === 'cliente' ? q.eq('visivel_cliente', true) : q.eq('visivel_site', true);
      const { data } = await q;
      setItems((data as FaqItem[]) || []);
      setLoading(false);
    })();
  }, [contexto]);

  // Apenas setores que possuem perguntas
  const setoresDisponiveis = useMemo(() => {
    const usados = new Set(items.map((i) => i.setor));
    return FAQ_SETORES.filter((s) => usados.has(s.key));
  }, [items]);

  const filtradas = useMemo(() => {
    const term = query.trim().toLowerCase();
    return items.filter((i) => {
      if (setor !== 'todos' && i.setor !== setor) return false;
      if (term) {
        const txt = (i.pergunta + ' ' + i.resposta.replace(/<[^>]+>/g, ' ')).toLowerCase();
        if (!txt.includes(term)) return false;
      }
      return true;
    });
  }, [items, setor, query]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="space-y-4">
      {busca && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar dúvida..."
            className="w-full h-11 pl-10 pr-3 rounded-lg border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      )}

      {/* Filtros por setor */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSetor('todos')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            setor === 'todos' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'
          }`}
        >
          Todos
        </button>
        {setoresDisponiveis.map((s) => (
          <button
            key={s.key}
            onClick={() => setSetor(s.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              setor === s.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'
            }`}
          >
            {s.icone} {s.label}
          </button>
        ))}
      </div>

      {/* Accordion */}
      {filtradas.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-6">Nenhuma dúvida encontrada.</p>
      ) : (
        <div className="space-y-2">
          {filtradas.map((item) => {
            const open = aberta === item.id;
            const setorInfo = getSetor(item.setor);
            return (
              <div key={item.id} className="rounded-xl border border-border bg-card overflow-hidden">
                <button
                  onClick={() => setAberta(open ? null : item.id)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left"
                >
                  <span className="flex items-start gap-2 font-medium text-foreground text-sm">
                    <span className="shrink-0">{setorInfo.icone}</span>
                    {item.pergunta}
                  </span>
                  <ChevronDown className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
                {open && (
                  <div
                    className="px-4 pb-4 pt-0 text-sm text-muted-foreground leading-relaxed faq-content"
                    dangerouslySetInnerHTML={{ __html: item.resposta }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
