import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Power, PlayCircle, Loader2 } from 'lucide-react';
import {
  contarTarefasPendentes,
  desativarPosVenda,
  reativarPosVenda,
  type OwnerFilter,
} from '@/lib/posvendaTarefas';

/**
 * Botão único que alterna entre "Desativar pós-venda" (quando há pendentes)
 * e "Reativar pós-venda" (quando não há e existe data de instalação).
 * Usa window.confirm para simplificar — sem dependência extra.
 */
export default function PosVendaControles({
  owner,
  dataInstalacao,
  diaLeitura,
  dataNascimento,
  onChanged,
  compact,
}: {
  owner: OwnerFilter;
  dataInstalacao: string | null | undefined; // yyyy-mm-dd
  diaLeitura: number | null;
  dataNascimento?: string | null;
  onChanged?: () => void;
  compact?: boolean;
}) {
  const [pendentes, setPendentes] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!owner.projetoId && !owner.clienteBaseId) { setPendentes(0); return; }
    setPendentes(await contarTarefasPendentes(owner));
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [owner.projetoId, owner.clienteBaseId]);

  if (!owner.projetoId && !owner.clienteBaseId) return null;
  if (pendentes === null) return null;

  const temInstalacao = !!dataInstalacao;

  const desativar = async () => {
    if (!confirm(`Isto vai excluir ${pendentes} lembrete(s) pendente(s) deste cliente. Tarefas já concluídas serão preservadas como histórico. Deseja continuar?`)) return;
    setBusy(true);
    try {
      const n = await desativarPosVenda(owner);
      toast.success(`Pós-venda desativado (${n} lembrete(s) removido(s)).`);
      await load();
      onChanged?.();
    } catch (e: any) {
      toast.error('Erro ao desativar: ' + (e?.message || e));
    } finally { setBusy(false); }
  };

  const reativar = async () => {
    if (!temInstalacao) { toast.error('Data de instalação não definida.'); return; }
    if (!confirm('Deseja reativar o pós-venda? Serão criados os lembretes futuros a partir da instalação.')) return;
    setBusy(true);
    try {
      const n = await reativarPosVenda({
        ...owner,
        dataInstalacao: new Date(dataInstalacao! + 'T00:00:00'),
        diaLeitura,
        dataNascimento: dataNascimento ? new Date(dataNascimento + 'T00:00:00') : null,
      });
      if (n > 0) toast.success(`Pós-venda reativado (${n} lembrete(s) criado(s)).`);
      else toast.info('Nenhum lembrete novo — todos já existiam.');
      await load();
      onChanged?.();
    } catch (e: any) {
      toast.error('Erro ao reativar: ' + (e?.message || e));
    } finally { setBusy(false); }
  };

  const btnBase = compact
    ? 'inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md font-medium'
    : 'inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md font-medium';

  if (pendentes > 0) {
    return (
      <button onClick={desativar} disabled={busy} className={`${btnBase} bg-destructive/10 text-destructive hover:bg-destructive/20 disabled:opacity-50`}>
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Power className="w-3.5 h-3.5" />}
        Desativar pós-venda ({pendentes})
      </button>
    );
  }

  if (!temInstalacao) {
    return compact ? null : (
      <span className="text-xs text-muted-foreground italic">O pós-venda é iniciado ao concluir a obra.</span>
    );
  }

  return (
    <button onClick={reativar} disabled={busy} className={`${btnBase} bg-green-600/10 text-green-700 dark:text-green-400 hover:bg-green-600/20 disabled:opacity-50`}>
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlayCircle className="w-3.5 h-3.5" />}
      Reativar pós-venda
    </button>
  );
}
