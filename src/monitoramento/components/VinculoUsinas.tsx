import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Link2, Check, Zap, MapPin, RefreshCw, Pencil, Search } from 'lucide-react';
import {
  listarUsinasSemVinculo,
  listarUsinasVinculadas,
  listarClientesParaVinculo,
  confirmarVinculo,
  desfazerVinculo,
  atualizarKwp,
} from '../lib/usinas';
import { sugerirClientes, normalizar } from '../lib/similaridade';
import type { ClienteBaseResumo, MonUsina } from '../types';

const MARCA_LABEL: Record<string, string> = {
  foxess: 'FoxESS',
  solarman: 'Solarman',
  solis: 'Solis',
  sofarcloud: 'SofarCloud',
  hoymiles: 'Hoymiles',
};

// Ajuste manual de kWp — último recurso quando nem a API da marca nem o
// fallback automático via cliente vinculado resolvem (ver
// preencherKwpAusente em mon-coleta/index.ts). Clique no valor (ou no
// "—", se ainda não tiver nenhum) pra editar.
function KwpEditavel({ usina, onSalvo }: { usina: MonUsina; onSalvo: () => void }) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(usina.kwp != null ? String(usina.kwp) : '');
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    const numero = valor.trim() === '' ? null : Number(valor.replace(',', '.'));
    if (numero != null && (Number.isNaN(numero) || numero <= 0)) {
      toast.error('kWp precisa ser um número maior que zero (ou vazio pra limpar).');
      return;
    }
    setSalvando(true);
    try {
      await atualizarKwp(usina.id, numero);
      toast.success('kWp atualizado.');
      setEditando(false);
      onSalvo();
    } catch (e: any) {
      toast.error('Erro ao salvar kWp: ' + e.message);
    } finally {
      setSalvando(false);
    }
  };

  if (!editando) {
    return (
      <button
        onClick={() => setEditando(true)}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
        title="Ajustar kWp manualmente"
      >
        {usina.kwp ? `${usina.kwp} kWp` : 'sem kWp'} <Pencil className="w-3 h-3" />
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <input
        type="text"
        inputMode="decimal"
        autoFocus
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && salvar()}
        placeholder="kWp"
        className="solar-input text-xs py-0.5 px-1.5 w-16"
      />
      <button onClick={salvar} disabled={salvando} className="text-xs text-primary font-medium disabled:opacity-50">
        OK
      </button>
      <button onClick={() => setEditando(false)} className="text-xs text-muted-foreground">
        ✕
      </button>
    </div>
  );
}

// Campo de busca pra escolher o cliente no vínculo (2026-10-17, pedido
// do usuário — antes era um <select> só, difícil de navegar com a base
// de clientes crescendo). Mostra as sugestões por similaridade primeiro
// (quando não há busca digitada), e filtra por nome (sem acento/caixa,
// via `normalizar`) conforme o usuário digita.
function SeletorCliente({
  clientes,
  sugestoes,
  valorId,
  onSelecionar,
}: {
  clientes: ClienteBaseResumo[];
  sugestoes: { item: ClienteBaseResumo; pontuacao: number }[];
  valorId: string;
  onSelecionar: (id: string) => void;
}) {
  const clienteSelecionado = useMemo(() => clientes.find((c) => c.id === valorId) ?? null, [clientes, valorId]);
  const [busca, setBusca] = useState(clienteSelecionado?.nome_completo ?? '');
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mantém o texto do campo sincronizado se o valor mudar por fora
  // (ex.: sugestão automática aplicada ao carregar a linha).
  useEffect(() => {
    setBusca(clienteSelecionado?.nome_completo ?? '');
  }, [clienteSelecionado?.id]);

  useEffect(() => {
    function fecharSeClicarFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener('mousedown', fecharSeClicarFora);
    return () => document.removeEventListener('mousedown', fecharSeClicarFora);
  }, []);

  const termo = normalizar(busca);
  const pontuacaoPorId = useMemo(() => {
    const mapa = new Map<string, number>();
    sugestoes.forEach((s) => mapa.set(s.item.id, s.pontuacao));
    return mapa;
  }, [sugestoes]);

  const resultados = useMemo(() => {
    if (!termo || termo === normalizar(clienteSelecionado?.nome_completo)) {
      return sugestoes.length > 0 ? sugestoes.map((s) => s.item) : clientes.slice(0, 20);
    }
    return clientes.filter((c) => normalizar(c.nome_completo).includes(termo)).slice(0, 20);
  }, [termo, clientes, sugestoes, clienteSelecionado]);

  return (
    <div className="relative w-full sm:w-64" ref={containerRef}>
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          className="solar-input text-sm py-1.5 pl-7 pr-2 w-full"
          placeholder="Buscar cliente…"
          value={busca}
          onFocus={() => setAberto(true)}
          onChange={(e) => {
            setBusca(e.target.value);
            setAberto(true);
            if (valorId) onSelecionar('');
          }}
        />
      </div>
      {aberto && resultados.length > 0 && (
        <div className="absolute z-10 mt-1 w-full max-h-56 overflow-auto rounded-lg border border-border bg-background shadow-lg">
          {resultados.map((c) => {
            const pontuacao = pontuacaoPorId.get(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onSelecionar(c.id);
                  setBusca(c.nome_completo ?? '');
                  setAberto(false);
                }}
                className="w-full text-left text-sm px-2 py-1.5 hover:bg-muted/60"
              >
                {c.nome_completo || '(sem nome)'}
                {pontuacao != null && pontuacao >= 0.4 && <span className="text-xs text-primary ml-1">— sugerido</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LinhaUsinaSemVinculo({
  usina,
  clientes,
  onVinculado,
}: {
  usina: MonUsina;
  clientes: ClienteBaseResumo[];
  onVinculado: () => void;
}) {
  const sugestoes = useMemo(
    () => sugerirClientes(clientes, { nomeUsina: usina.modelo ?? usina.sn_inversor, cidade: usina.cidade }),
    [clientes, usina]
  );
  const melhorSugestao = sugestoes[0] && sugestoes[0].pontuacao >= 0.4 ? sugestoes[0] : null;

  const [selecionado, setSelecionado] = useState<string>(melhorSugestao?.item.id ?? '');
  const [salvando, setSalvando] = useState(false);

  const confirmar = async () => {
    if (!selecionado) {
      toast.error('Escolha um cliente antes de confirmar.');
      return;
    }
    setSalvando(true);
    try {
      await confirmarVinculo(usina.id, selecionado);
      toast.success('Vínculo confirmado.');
      onVinculado();
    } catch (e: any) {
      toast.error('Erro ao confirmar vínculo: ' + e.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 rounded-lg border border-border bg-muted/30">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Zap className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="font-medium truncate">
            {MARCA_LABEL[usina.marca] ?? usina.marca} — {usina.modelo || usina.sn_inversor || usina.id_externo}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
            {usina.cidade && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3 h-3 shrink-0" /> {usina.cidade}
              </span>
            )}
            <KwpEditavel usina={usina} onSalvo={onVinculado} />
          </p>
        </div>
      </div>

      <SeletorCliente clientes={clientes} sugestoes={sugestoes} valorId={selecionado} onSelecionar={setSelecionado} />

      <button
        onClick={confirmar}
        disabled={salvando || !selecionado}
        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        <Check className="w-3.5 h-3.5" /> Confirmar
      </button>
    </div>
  );
}

export default function VinculoUsinas() {
  const [loading, setLoading] = useState(true);
  const [semVinculo, setSemVinculo] = useState<MonUsina[]>([]);
  const [vinculadas, setVinculadas] = useState<MonUsina[]>([]);
  const [clientes, setClientes] = useState<ClienteBaseResumo[]>([]);
  const [mostrarVinculadas, setMostrarVinculadas] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const [sv, v, c] = await Promise.all([
        listarUsinasSemVinculo(),
        listarUsinasVinculadas(),
        listarClientesParaVinculo(),
      ]);
      setSemVinculo(sv);
      setVinculadas(v);
      setClientes(c);
    } catch (e: any) {
      toast.error('Erro ao carregar usinas: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const clientesPorId = useMemo(() => {
    const map = new Map<string, ClienteBaseResumo>();
    clientes.forEach((c) => map.set(c.id, c));
    return map;
  }, [clientes]);

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
          <Link2 className="w-5 h-5" /> Vínculo de usinas
        </h2>
        <button
          onClick={carregar}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-muted hover:bg-muted/70"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Atualizar
        </button>
      </div>

      <div className="solar-card p-4">
        <p className="text-sm text-muted-foreground mb-3">
          {semVinculo.length === 0
            ? 'Nenhuma usina pendente de vínculo.'
            : `${semVinculo.length} usina(s) aguardando confirmação de vínculo com um cliente.`}
        </p>

        {semVinculo.length > 0 && (
          <div className="space-y-2">
            {semVinculo.map((usina) => (
              <LinhaUsinaSemVinculo key={usina.id} usina={usina} clientes={clientes} onVinculado={carregar} />
            ))}
          </div>
        )}
      </div>

      <div className="solar-card p-4">
        <button
          onClick={() => setMostrarVinculadas((v) => !v)}
          className="text-sm font-medium text-primary hover:underline"
        >
          {mostrarVinculadas ? 'Esconder' : 'Ver'} usinas já vinculadas ({vinculadas.length})
        </button>

        {mostrarVinculadas && (
          <div className="space-y-2 mt-3">
            {vinculadas.map((usina) => {
              const cliente = usina.cliente_base_id ? clientesPorId.get(usina.cliente_base_id) : undefined;
              return (
                <div
                  key={usina.id}
                  className="flex items-center justify-between gap-2 p-3 rounded-lg border border-border bg-muted/20"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {MARCA_LABEL[usina.marca] ?? usina.marca} — {usina.modelo || usina.sn_inversor || usina.id_externo}
                    </p>
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
                      {cliente?.nome_completo || 'Cliente não encontrado'}
                      <span className="opacity-50">•</span>
                      <KwpEditavel usina={usina} onSalvo={carregar} />
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      await desfazerVinculo(usina.id);
                      toast.success('Vínculo desfeito.');
                      carregar();
                    }}
                    className="shrink-0 text-xs text-muted-foreground hover:text-destructive"
                  >
                    Desfazer
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
