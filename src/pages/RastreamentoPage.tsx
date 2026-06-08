import { useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import logoTls from '@/assets/logo.png';
import { Check, Lock, Loader2, Star, MapPin, Calendar, Hash, Zap, ExternalLink, MessageCircle, Heart, Building2, Home, HelpCircle } from 'lucide-react';
import { fmtDateBR } from '@/lib/dateUtils';
import { toast } from 'sonner';
import FaqSection from '@/components/faq/FaqSection';

interface EtapaCli {
  etapa: number;
  titulo: string;
  concluido: boolean;
  data_conclusao: string | null;
  campo_extra: Record<string, any>;
}
interface FluxoCli {
  fluxo: number;
  titulo: string;
  icone: string;
  etapas: EtapaCli[];
}
interface PosVendaCli {
  descricao: string;
  tipo: string;
  data_programada: string;
  concluido: boolean;
}
interface RastreamentoData {
  nome: string;
  fluxos: FluxoCli[];
  posvenda?: PosVendaCli[];
  sistema_operacao: boolean;
  avaliacao: { nota: number; comentario: string | null } | null;
}

const WHATSAPP_BASE = 'https://wa.me/?text=';

export default function RastreamentoPage() {
  const { codigo } = useParams();
  const [data, setData] = useState<RastreamentoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [config, setConfig] = useState<{ google_link: string; indicacao_texto: string }>({ google_link: '', indicacao_texto: '' });

  // avaliação
  const [nota, setNota] = useState(0);
  const [hover, setHover] = useState(0);
  const [comentario, setComentario] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [showIndicacao, setShowIndicacao] = useState(false);

  useEffect(() => {
    if (!codigo) return;
    (async () => {
      setLoading(true);
      const { data: res, error } = await supabase.functions.invoke('rastreamento', { body: { action: 'get', codigo } });
      if (error || !res || (res as any).error) {
        setNotFound(true);
      } else {
        setData(res as RastreamentoData);
        if ((res as RastreamentoData).avaliacao) {
          setNota((res as RastreamentoData).avaliacao!.nota);
          setEnviado(true);
        }
      }
      const { data: cfg } = await supabase.functions.invoke('rastreamento', { body: { action: 'config' } });
      if (cfg && !(cfg as any).error) setConfig(cfg as any);
      setLoading(false);
    })();
  }, [codigo]);

  const link = typeof window !== 'undefined' ? window.location.href : '';

  const enviarAvaliacao = async (notaFinal: number, comentarioFinal?: string) => {
    setEnviando(true);
    const { error } = await supabase.functions.invoke('rastreamento', {
      body: { action: 'avaliar', codigo, nota: notaFinal, comentario: comentarioFinal ?? null },
    });
    setEnviando(false);
    if (error) { toast.error('Erro ao enviar avaliação.'); return; }
    setEnviado(true);
    toast.success('Obrigado pela sua avaliação!');
  };

  const handleStar = (n: number) => {
    setNota(n);
    if (n === 5) enviarAvaliacao(5);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 px-4 text-center">
        <img src={logoTls} alt="Três Lagoas Solar" className="h-16 mb-6" />
        <h1 className="text-xl font-bold text-foreground mb-2">Link inválido</h1>
        <p className="text-muted-foreground">Não encontramos um projeto para este link de acompanhamento.</p>
      </div>
    );
  }

  const { feitos, total } = data.fluxos.reduce(
    (acc, f) => {
      f.etapas.forEach((e) => {
        acc.total++;
        if (e.concluido) acc.feitos++;
      });
      return acc;
    },
    { feitos: 0, total: 0 },
  );
  const pct = total ? Math.round((feitos / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-primary text-primary-foreground">
        <div className="max-w-2xl mx-auto px-4 py-8 text-center">
          <img src={logoTls} alt="Três Lagoas Solar" className="h-14 mx-auto mb-4 bg-white/90 rounded-lg p-2" />
          <h1 className="text-2xl font-bold">Olá, {data.nome}! 🌞</h1>
          <p className="text-primary-foreground/85 mt-1">Veja como está o seu projeto de energia solar.</p>

          {/* Barra de progresso geral */}
          <div className="mt-5 max-w-md mx-auto">
            <div className="h-3 rounded-full bg-primary-foreground/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-secondary transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-sm font-semibold mt-2">{pct}% concluído</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {data.fluxos.map((f) => (
          <FluxoTimeline key={f.fluxo} fluxo={f} />
        ))}

        {/* Pós-venda visível ao cliente */}
        {data.posvenda && data.posvenda.length > 0 && (
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🌟</span>
              <h2 className="text-lg font-bold text-foreground">Acompanhamento pós-venda</h2>
            </div>
            <ul className="space-y-2">
              {data.posvenda.map((t, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${t.concluido ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                    {t.concluido ? <Check className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                  </span>
                  <span className="flex-1 text-foreground">{t.descricao}</span>
                  <span className="text-xs text-muted-foreground">{fmtDateBR(t.data_programada)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Dúvidas frequentes */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Dúvidas frequentes</h2>
          </div>
          <FaqSection contexto="cliente" />
        </section>


        {/* Pós-instalação */}
        {data.sistema_operacao && (
          <section className="rounded-2xl border border-border bg-card p-6 space-y-5">
            <div className="text-center space-y-1">
              <h2 className="text-lg font-bold text-foreground">Conte-nos como foi sua experiência!</h2>
              <p className="text-sm text-muted-foreground">Sua opinião é muito importante para a Três Lagoas Solar.</p>
            </div>

            <div className="flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  disabled={enviado || enviando}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => handleStar(n)}
                  className="disabled:cursor-default transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-9 h-9 ${(hover || nota) >= n ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/40'}`}
                  />
                </button>
              ))}
            </div>

            {/* Nota 5 */}
            {enviado && nota === 5 && (
              <div className="rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-4 text-center space-y-3">
                <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                  Que incrível! 🌟 Que tal compartilhar sua experiência no Google? Ajuda outros a conhecerem a Três Lagoas Solar!
                </p>
                {config.google_link && (
                  <a
                    href={config.google_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700"
                  >
                    Avaliar no Google <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            )}

            {/* Nota < 5 */}
            {nota > 0 && nota < 5 && (
              <div className="space-y-3">
                {enviado ? (
                  <p className="text-center text-sm text-muted-foreground">Obrigado pelo seu feedback! 💚</p>
                ) : (
                  <>
                    <label className="block text-sm font-medium text-foreground">
                      Obrigado pelo feedback! O que poderíamos ter feito melhor?
                    </label>
                    <textarea
                      className="solar-input min-h-[90px]"
                      value={comentario}
                      onChange={(e) => setComentario(e.target.value)}
                      placeholder="Conte para a gente..."
                    />
                    <button
                      onClick={() => enviarAvaliacao(nota, comentario)}
                      disabled={enviando}
                      className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                    >
                      {enviando ? 'Enviando...' : 'Enviar feedback'}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Programa de indicação */}
            <div className="rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-green-600 fill-green-600" />
                <h3 className="font-bold text-green-800 dark:text-green-200">Conheça nosso programa de indicação!</h3>
              </div>
              <p className="text-sm text-green-800/90 dark:text-green-200/90">{config.indicacao_texto}</p>
              <button
                onClick={() => setShowIndicacao(true)}
                className="w-full py-2.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700"
              >
                Quero indicar um amigo
              </button>
            </div>
          </section>
        )}
      </main>

      <footer className="py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Três Lagoas Solar
      </footer>

      {/* Modal indicação */}
      {showIndicacao && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4" onClick={() => setShowIndicacao(false)}>
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full space-y-4 text-center" onClick={(e) => e.stopPropagation()}>
            <Heart className="w-10 h-10 text-green-600 fill-green-600 mx-auto" />
            <h3 className="text-lg font-bold text-foreground">Indique e ganhe! 💚</h3>
            <p className="text-sm text-muted-foreground">
              Acesse a plataforma "Energia que Volta" para gerar seu link de indicação personalizado e acompanhar seus benefícios.
            </p>
            <a
              href="/energia"
              className="block w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
            >
              Acessar Energia que Volta
            </a>
            <a
              href={`${WHATSAPP_BASE}${encodeURIComponent('Olá! Acabei de instalar energia solar com a Três Lagoas Solar e estou economizando na conta de luz. Você também pode! Confira: https://treslagoassolar.com.br')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700"
            >
              <MessageCircle className="w-4 h-4" /> Compartilhar no WhatsApp
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function FluxoTimeline({ fluxo }: { fluxo: FluxoCli }) {
  // primeira etapa não concluída = "em andamento"
  const firstPendingIdx = useMemo(() => fluxo.etapas.findIndex((e) => !e.concluido), [fluxo]);

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">{fluxo.icone}</span>
        <h2 className="text-lg font-bold text-foreground">{fluxo.titulo}</h2>
      </div>
      <ol className="space-y-1">
        {fluxo.etapas.map((e, idx) => {
          const status: 'done' | 'current' | 'pending' = e.concluido
            ? 'done'
            : idx === firstPendingIdx
            ? 'current'
            : 'pending';
          const isLast = idx === fluxo.etapas.length - 1;
          return (
            <li key={e.etapa} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    status === 'done'
                      ? 'bg-green-500 text-white'
                      : status === 'current'
                      ? 'bg-yellow-400 text-yellow-950'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {status === 'done' ? (
                    <Check className="w-5 h-5" />
                  ) : status === 'current' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                </div>
                {!isLast && <div className={`w-0.5 flex-1 min-h-[20px] ${status === 'done' ? 'bg-green-500' : 'bg-border'}`} />}
              </div>
              <div className={`pb-4 pt-1.5 ${status === 'pending' ? 'opacity-60' : ''}`}>
                <p className="font-medium text-foreground text-sm">{e.titulo}</p>
                {e.concluido && e.data_conclusao && (
                  <p className="text-xs text-muted-foreground">{fmtDateBR(e.data_conclusao)}</p>
                )}
                <EtapaExtra fluxo={fluxo.fluxo} etapa={e} status={status} />
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function EtapaExtra({ fluxo, etapa, status }: { fluxo: number; etapa: EtapaCli; status: string }) {
  const ce = etapa.campo_extra || {};

  // Fluxo 2 etapa 4 — local de entrega
  if (fluxo === 2 && etapa.etapa === 4 && ce.local_entrega) {
    const isEmpresa = ce.local_entrega === 'empresa';
    return (
      <p className="text-xs text-foreground/80 mt-1 inline-flex items-center gap-1">
        {isEmpresa ? <Building2 className="w-3.5 h-3.5" /> : <Home className="w-3.5 h-3.5" />}
        Entregue em: {isEmpresa ? 'Empresa TLS Solar' : 'Seu endereço'}
      </p>
    );
  }
  // Fluxo 3 etapa 1 — fila
  if (fluxo === 3 && etapa.etapa === 1 && !etapa.concluido && ce.numero_fila) {
    return (
      <p className="text-xs text-foreground/80 mt-1 inline-flex items-center gap-1">
        <Hash className="w-3.5 h-3.5" /> Você está na posição Nº {ce.numero_fila} da nossa fila de instalações
      </p>
    );
  }
  // Fluxo 3 etapa 2 — data agendada
  if (fluxo === 3 && etapa.etapa === 2 && ce.data_agendamento) {
    return (
      <p className="text-xs text-foreground/80 mt-1 inline-flex items-center gap-1">
        <Calendar className="w-3.5 h-3.5" /> Sua instalação está agendada para {fmtDateBR(ce.data_agendamento)}
      </p>
    );
  }
  // Fluxo 3 etapa 4 — operação
  if (fluxo === 3 && etapa.etapa === 4 && etapa.concluido && ce.data_operacao) {
    return (
      <p className="text-xs text-green-700 dark:text-green-400 mt-1 inline-flex items-center gap-1 font-medium">
        <Zap className="w-3.5 h-3.5" /> Seu sistema entrou em operação em {fmtDateBR(ce.data_operacao)}
      </p>
    );
  }
  return null;
}
