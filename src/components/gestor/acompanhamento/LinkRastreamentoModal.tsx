import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { X, Copy, MessageCircle, Link2, Loader2 } from 'lucide-react';
import { defaultEtapasSeed } from '@/lib/rastreamentoEtapas';

const BASE_URL = 'https://treslagoassolar.com.br';

function genCodigo() {
  const rand = () => Math.random().toString(36).slice(2).toUpperCase();
  return `TLS-${rand().slice(0, 4)}-${rand().slice(0, 3)}`;
}

export default function LinkRastreamentoModal({ projeto, onClose, onGenerated }: {
  projeto: { id: string; nome: string; telefone?: string | null; codigo_rastreamento?: string | null };
  onClose: () => void;
  onGenerated?: () => void;
}) {
  const [codigo, setCodigo] = useState<string | null>(projeto.codigo_rastreamento || null);
  const [generating, setGenerating] = useState(false);

  const link = codigo ? `${BASE_URL}/acompanhar/${codigo}` : '';

  const gerar = async () => {
    setGenerating(true);
    let novoCodigo = genCodigo();
    // tenta gravar, com algumas tentativas em caso de colisão
    let saved = false;
    for (let i = 0; i < 5 && !saved; i++) {
      const { error } = await supabase.from('projetos' as any).update({ codigo_rastreamento: novoCodigo }).eq('id', projeto.id);
      if (!error) { saved = true; break; }
      novoCodigo = genCodigo();
    }
    if (!saved) { toast.error('Não foi possível gerar o código.'); setGenerating(false); return; }

    // semeia as etapas se ainda não existirem
    const { data: existing } = await supabase.from('rastreamento_obras' as any).select('id').eq('projeto_id', projeto.id).limit(1);
    if (!existing || existing.length === 0) {
      await supabase.from('rastreamento_obras' as any).insert(defaultEtapasSeed(projeto.id));
    }

    setCodigo(novoCodigo);
    setGenerating(false);
    toast.success('Link gerado!');
    onGenerated?.();
  };

  const copiar = () => {
    navigator.clipboard.writeText(link);
    toast.success('Link copiado!');
  };

  const whatsapp = () => {
    const msg = `Olá ${projeto.nome}! Agora você pode acompanhar em tempo real o andamento do seu projeto solar.\n\nAcesse: ${link}`;
    const phone = (projeto.telefone || '').replace(/\D/g, '');
    const wa = phone ? `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(wa, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="bg-card rounded-2xl p-6 max-w-md w-full space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2"><Link2 className="w-5 h-5 text-primary" /> Link de rastreamento</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <p className="text-sm text-muted-foreground">{projeto.nome}</p>

        {!codigo ? (
          <button onClick={gerar} disabled={generating} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
            Gerar link de rastreamento
          </button>
        ) : (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-muted text-sm break-all text-foreground">{link}</div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={copiar} className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-muted text-foreground text-sm font-medium hover:bg-muted/70">
                <Copy className="w-4 h-4" /> Copiar link
              </button>
              <button onClick={whatsapp} className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700">
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
