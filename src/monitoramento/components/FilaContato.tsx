import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Phone, MapPin, Zap, MessageSquarePlus, CheckCircle2, History, ChevronRight } from 'lucide-react';
import {
  listarChamadosAbertos,
  listarChamadosResolvidosRecentes,
  listarEventos,
  moverEtapa,
  resolverManualmente,
  registrarEvento,
  type ChamadoComContexto,
} from '../lib/chamados';
import type { MonChamadoEvento, MonEtapaChamado } from '../types';
import { useAuth } from '@/contexts/AuthContext';

// Fila de contato (Fase 2) — kanban reativo, isolado do calendário de
// lembretes de `tarefas_posvenda`. Os chamados abrem e fecham sozinhos
// (edge function `mon-coleta`); aqui a equipe só avança a etapa do
// contato humano e registra o que foi feito.

const MARCA_LABEL: Record<string, string> = {
  foxess: 'FoxESS',
  solarman: 'Solarman',
  solis: 'Solis',
  sofarcloud: 'SofarCloud',
  hoymiles: 'Hoymiles',
};

const TIPO_LABEL: Record<string, string> = {
  offline: 'Offline',
  sem_geracao: 'Sem geração',
  baixo_desempenho: 'Baixo desempenho',
  solicitado_cliente: 'Solicitado pelo cliente',
};

const COLUNAS: { etapa: MonEtapaChamado; titulo: string }[] = [
  { etapa: 'novo', titulo: 'Novo' },
  { etapa: 'contato_feito', titulo: 'Contato feito' },
  { etapa: 'aguardando_cliente', titulo: 'Aguardando cliente' },
  { etapa: 'visita_agendada', titulo: 'Visita agendada' },
];

function formatarHaQuanto(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return 'agora mesmo';
  if (min < 60) return `há ${min} min`;
  const horas = Math.round(min / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.round(horas / 24);
  return `há ${dias} d`;
}

function proximaEtapa(etapa: MonEtapaChamado): MonEtapaChamado | null {
  const ordem: MonEtapaChamado[] = ['novo', 'contato_feito', 'aguardando_cliente', 'visita_agendada', 'resolvido'];
  const i = ordem.indexOf(etapa);
  return i >= 0 && i < ordem.length - 1 ? ordem[i + 1] : null;
}

function CartaoChamado({
  chamado,
  usuarioId,
  onAtualizado,
}: {
  chamado: ChamadoComContexto;
  usuarioId: string | null;
  onAtualizado: () => void;
}) {
  const [expandido, setExpandido] = useState(false);
  const [eventos, setEventos] = useState<MonChamadoEvento[]>([]);
  const [carregandoEventos, setCarregandoEventos] = useState(false);
  const [nota, setNota] = useState('');
  const [salvando, setSalvando] = useState(false);

  const abrirHistorico = async () => {
    const vaiAbrir = !expandido;
    setExpandido(vaiAbrir);
    if (vaiAbrir && eventos.length === 0) {
      setCarregandoEventos(true);
      try {
        setEventos(await listarEventos(chamado.id));
      } catch (e: any) {
        toast.error('Erro ao carregar histórico: ' + e.message);
      } finally {
        setCarregandoEventos(false);
      }
    }
  };

  const avancar = async () => {
    const prox = proximaEtapa(chamado.etapa);
    if (!prox) return;
    setSalvando(true);
    try {
      if (prox === 'resolvido') {
        await resolverManualmente(chamado.id, usuarioId);
      } else {
        await moverEtapa(chamado.id, prox, usuarioId);
      }
      toast.success('Chamado atualizado.');
      onAtualizado();
    } catch (e: any) {
      toast.error('Erro ao mover chamado: ' + e.message);
    } finally {
      setSalvando(false);
    }
  };

  const registrarContato = async () => {
    setSalvando(true);
    try {
      await registrarEvento(chamado.id, 'contato', nota || 'Contato registrado', usuarioId);
      if (chamado.etapa === 'novo') {
        await moverEtapa(chamado.id, 'contato_feito', usuarioId);
      }
      setNota('');
      toast.success('Contato registrado.');
      onAtualizado();
    } catch (e: any) {
      toast.error('Erro ao registrar contato: ' + e.message);
    } finally {
      setSalvando(false);
    }
  };

  const prox = proximaEtapa(chamado.etapa);

  return (
    <div className="p-3 rounded-lg border border-border bg-background space-y-2">
      <div className="flex items-start gap-2">
        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Zap className="w-3.5 h-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">
            {chamado.usina ? MARCA_LABEL[chamado.usina.marca] ?? chamado.usina.marca : '—'} —{' '}
            {chamado.usina?.modelo || chamado.usina?.sn_inversor || chamado.usina?.id_externo}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
            {chamado.usina?.cidade && (
              <>
                <MapPin className="w-3 h-3 shrink-0" /> {chamado.usina.cidade}
              </>
            )}
          </p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {chamado.cliente?.nome_completo || 'Cliente não vinculado'}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-700 border border-amber-200">
          {TIPO_LABEL[chamado.tipo] ?? chamado.tipo}
        </span>
        <span className="text-[11px] text-muted-foreground">aberto {formatarHaQuanto(chamado.aberto_em)}</span>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={registrarContato}
          disabled={salvando}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-muted hover:bg-muted/70 disabled:opacity-50"
        >
          <Phone className="w-3 h-3" /> Registrar contato
        </button>
        {prox && (
          <button
            onClick={avancar}
            disabled={salvando}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {prox === 'resolvido' ? (
              <>
                <CheckCircle2 className="w-3 h-3" /> Resolver
              </>
            ) : (
              <>
                Avançar <ChevronRight className="w-3 h-3" />
              </>
            )}
          </button>
        )}
        <button
          onClick={abrirHistorico}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground"
        >
          <History className="w-3 h-3" /> Histórico
        </button>
      </div>

      {expandido && (
        <div className="pt-2 border-t border-border space-y-2">
          <div className="flex gap-1.5">
            <input
              className="solar-input text-xs py-1.5 px-2 flex-1"
              placeholder="Observação (opcional)…"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
            />
            <button
              onClick={async () => {
                if (!nota.trim()) return;
                setSalvando(true);
                try {
                  await registrarEvento(chamado.id, 'observacao', nota, usuarioId);
                  setNota('');
                  setEventos(await listarEventos(chamado.id));
                  toast.success('Observação registrada.');
                } catch (e: any) {
                  toast.error('Erro ao registrar observação: ' + e.message);
                } finally {
                  setSalvando(false);
                }
              }}
              disabled={salvando || !nota.trim()}
              className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-muted hover:bg-muted/70 disabled:opacity-50"
            >
              <MessageSquarePlus className="w-3 h-3" /> Anotar
            </button>
          </div>

          {carregandoEventos ? (
            <p className="text-xs text-muted-foreground">Carregando…</p>
          ) : eventos.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum evento registrado ainda.</p>
          ) : (
            <ul className="space-y-1">
              {eventos.map((ev) => (
                <li key={ev.id} className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{formatarHaQuanto(ev.criado_em)}</span>
                  {ev.mensagem ? ` — ${ev.mensagem}` : ` — ${ev.tipo}`}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function FilaContato() {
  const { session } = useAuth();
  const usuarioId: string | null = session?.user?.id ?? null;

  const [loading, setLoading] = useState(true);
  const [abertos, setAbertos] = useState<ChamadoComContexto[]>([]);
  const [resolvidos, setResolvidos] = useState<ChamadoComContexto[]>([]);
  const [mostrarResolvidos, setMostrarResolvidos] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const [a, r] = await Promise.all([listarChamadosAbertos(), listarChamadosResolvidosRecentes()]);
      setAbertos(a);
      setResolvidos(r);
    } catch (e: any) {
      toast.error('Erro ao carregar fila de contato: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const porColuna = useMemo(() => {
    const mapa = new Map<MonEtapaChamado, ChamadoComContexto[]>();
    COLUNAS.forEach((c) => mapa.set(c.etapa, []));
    abertos.forEach((c) => {
      mapa.get(c.etapa)?.push(c);
    });
    return mapa;
  }, [abertos]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold text-primary flex items-center gap-2">
          <Phone className="w-5 h-5" /> Fila de contato
        </h2>
        <p className="text-sm text-muted-foreground">
          {abertos.length === 0 ? 'Nenhum chamado aberto.' : `${abertos.length} chamado(s) aberto(s).`}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {COLUNAS.map((coluna) => {
          const itens = porColuna.get(coluna.etapa) ?? [];
          return (
            <div key={coluna.etapa} className="solar-card p-3 space-y-2 bg-muted/20">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{coluna.titulo}</h3>
                <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">{itens.length}</span>
              </div>
              <div className="space-y-2 min-h-[2rem]">
                {itens.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">Vazio</p>
                ) : (
                  itens.map((chamado) => (
                    <CartaoChamado key={chamado.id} chamado={chamado} usuarioId={usuarioId} onAtualizado={carregar} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="solar-card p-4">
        <button
          onClick={() => setMostrarResolvidos((v) => !v)}
          className="text-sm font-medium text-primary hover:underline"
        >
          {mostrarResolvidos ? 'Esconder' : 'Ver'} chamados resolvidos recentes ({resolvidos.length})
        </button>

        {mostrarResolvidos && (
          <div className="space-y-2 mt-3">
            {resolvidos.map((chamado) => (
              <div
                key={chamado.id}
                className="flex items-center justify-between gap-2 p-3 rounded-lg border border-border bg-muted/20"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">
                    {chamado.usina ? MARCA_LABEL[chamado.usina.marca] ?? chamado.usina.marca : '—'} —{' '}
                    {chamado.usina?.modelo || chamado.usina?.sn_inversor || chamado.usina?.id_externo}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {TIPO_LABEL[chamado.tipo] ?? chamado.tipo} • resolvido {chamado.resolucao === 'auto' ? 'automaticamente' : 'manualmente'}
                    {chamado.resolvido_em ? ` ${formatarHaQuanto(chamado.resolvido_em)}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
