import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Check, MessageCircle, Clock3, Eye, EyeOff, StickyNote, CalendarClock } from 'lucide-react';
import {
  type TarefaPosVenda, TIPO_ICONE,
  aplicarVariaveis, montarLinkWhatsApp, contaInfoDoTemplate,
} from '@/lib/posvendaTarefas';

function fmtData(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function addDiasISO(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function diasAte(iso: string): number {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const dt = new Date(iso + 'T00:00:00');
  return Math.round((dt.getTime() - hoje.getTime()) / 86400000);
}

function labelDiasAte(iso: string): string {
  const diff = diasAte(iso);
  if (diff < 0) return `há ${-diff} dias`;
  if (diff === 0) return 'hoje';
  if (diff === 1) return 'amanhã';
  return `daqui ${diff} dias`;
}

function statusData(iso: string, concluido: boolean): { label: string; cls: string } {
  if (concluido) return { label: 'Concluído', cls: 'bg-primary/10 text-primary' };
  const diff = diasAte(iso);
  if (diff < 0) return { label: `Atrasada ${-diff}d`, cls: 'bg-destructive/15 text-destructive' };
  if (diff === 0) return { label: 'Hoje', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-400' };
  return { label: `Em ${diff}d`, cls: 'bg-muted text-muted-foreground' };
}

export default function TarefaPosVendaItem({
  tarefa, nome, telefone, templateText, googleLink, onChanged, instaladoEm, diaLeitura,
}: {
  tarefa: TarefaPosVenda;
  nome: string;
  telefone: string | null;
  templateText: string;
  googleLink: string;
  onChanged: () => void;
  instaladoEm?: string | null;
  diaLeitura?: number | null;
}) {
  const { session } = useAuth();
  const [obs, setObs] = useState(tarefa.observacao || '');
  const [showObs, setShowObs] = useState(false);
  const [busy, setBusy] = useState(false);
  const st = statusData(tarefa.data_programada, tarefa.concluido);
  const aguardando = tarefa.aguardando_leitura;
  const contaInfo = contaInfoDoTemplate(tarefa.template_key);
  // Contexto exibido apenas em verificações de geração ancoradas na conta.
  const mostrarContexto = tarefa.tipo === 'verificar_geracao' && !!contaInfo && !aguardando;
  const dataSolicitarConta = mostrarContexto ? addDiasISO(tarefa.data_programada, 3) : null;

  const concluir = async () => {
    setBusy(true);
    const novo = !tarefa.concluido;
    const { error } = await supabase.from('tarefas_posvenda' as any).update({
      concluido: novo,
      data_conclusao: novo ? new Date().toISOString() : null,
      usuario_id: novo ? (session?.user?.id || null) : null,
    }).eq('id', tarefa.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    onChanged();
  };

  const adiar = async () => {
    setBusy(true);
    const nova = new Date(tarefa.data_programada + 'T00:00:00');
    nova.setDate(nova.getDate() + 3);
    const { error } = await supabase.from('tarefas_posvenda' as any).update({
      data_programada: nova.toISOString().slice(0, 10),
      adiamentos: (tarefa.adiamentos || 0) + 1,
    }).eq('id', tarefa.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Adiada 3 dias.');
    onChanged();
  };

  const salvarObs = async () => {
    if (obs === (tarefa.observacao || '')) return;
    await supabase.from('tarefas_posvenda' as any).update({ observacao: obs || null }).eq('id', tarefa.id);
  };

  const abrirWhatsApp = () => {
    const texto = aplicarVariaveis(templateText, nome, googleLink);
    window.open(montarLinkWhatsApp(telefone, texto), '_blank');
  };

  const toggleVisivel = async () => {
    await supabase.from('tarefas_posvenda' as any).update({ visivel_cliente: !tarefa.visivel_cliente }).eq('id', tarefa.id);
    onChanged();
  };

  return (
    <div className={`rounded-lg border p-3 ${tarefa.concluido ? 'border-border bg-muted/30 opacity-70' : 'border-border bg-card'}`}>
      <div className="flex items-start gap-2 flex-wrap">
        <button
          onClick={concluir}
          disabled={busy}
          className={`w-5 h-5 mt-0.5 rounded border flex items-center justify-center shrink-0 ${tarefa.concluido ? 'bg-primary border-primary text-primary-foreground' : 'border-input hover:border-primary'}`}
        >
          {tarefa.concluido && <Check className="w-3.5 h-3.5" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground">{TIPO_ICONE[tarefa.tipo]} {tarefa.descricao}</span>
            {aguardando ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-amber-500/15 text-amber-700 dark:text-amber-400">⚠️ Aguardando dia de leitura</span>
            ) : (
              <>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${st.cls}`}>{st.label}</span>
                <span className="text-[10px] text-muted-foreground">{fmtData(tarefa.data_programada)}</span>
              </>
            )}
            {tarefa.adiamentos > 0 && <span className="text-[10px] text-muted-foreground">• adiada {tarefa.adiamentos}x</span>}
            <button onClick={toggleVisivel} title="Visível ao cliente" className="text-muted-foreground hover:text-foreground">
              {tarefa.visivel_cliente ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
          </div>
          {mostrarContexto && (
            <div className="mt-1.5 rounded-md bg-muted/50 border border-border/60 px-2.5 py-1.5 text-[11px] text-muted-foreground space-y-0.5">
              {instaladoEm && <div>Instalado em: <span className="text-foreground">{fmtData(instaladoEm)}</span></div>}
              {diaLeitura != null && <div>Leitura prevista: <span className="text-foreground">dia {diaLeitura}</span></div>}
              {dataSolicitarConta && (
                <div className="flex items-center gap-1">
                  <CalendarClock className="w-3 h-3" />
                  Solicitar conta em: <span className="text-foreground font-medium">{fmtData(dataSolicitarConta)}</span> ({labelDiasAte(dataSolicitarConta)})
                </div>
              )}
            </div>
          )}
          {aguardando && (
            <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-400">
              Defina o dia de leitura da conta do cliente para calcular esta data automaticamente.
            </p>
          )}
          {!tarefa.concluido && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <button onClick={abrirWhatsApp} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-green-600 text-white hover:bg-green-700">
                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
              </button>
              <button onClick={adiar} disabled={busy} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-muted text-foreground hover:bg-muted/70">
                <Clock3 className="w-3.5 h-3.5" /> Adiar 3 dias
              </button>
              <button onClick={() => setShowObs(s => !s)} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground hover:bg-muted/70">
                <StickyNote className="w-3.5 h-3.5" /> Observação
              </button>
            </div>
          )}
          {showObs && (
            <textarea
              value={obs}
              onChange={e => setObs(e.target.value)}
              onBlur={salvarObs}
              placeholder="Observação interna..."
              className="solar-input mt-2 min-h-[56px] text-xs w-full"
            />
          )}
          {!showObs && tarefa.observacao && (
            <p className="mt-1 text-[11px] text-muted-foreground italic">📝 {tarefa.observacao}</p>
          )}
        </div>
      </div>
    </div>
  );
}
