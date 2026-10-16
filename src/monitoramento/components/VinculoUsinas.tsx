import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Link2, Check, Zap, MapPin, RefreshCw } from 'lucide-react';
import {
  listarUsinasSemVinculo,
  listarUsinasVinculadas,
  listarClientesParaVinculo,
  confirmarVinculo,
  desfazerVinculo,
} from '../lib/usinas';
import { sugerirClientes } from '../lib/similaridade';
import type { ClienteBaseResumo, MonUsina } from '../types';

const MARCA_LABEL: Record<string, string> = {
  foxess: 'FoxESS',
  solarman: 'Solarman',
  solis: 'Solis',
  sofarcloud: 'SofarCloud',
  hoymiles: 'Hoymiles',
};

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
          <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
            {usina.cidade && (
              <>
                <MapPin className="w-3 h-3 shrink-0" /> {usina.cidade}
              </>
            )}
            {usina.kwp ? ` • ${usina.kwp} kWp` : ''}
          </p>
        </div>
      </div>

      <select
        className="solar-input text-sm py-1.5 px-2 w-full sm:w-64"
        value={selecionado}
        onChange={(e) => setSelecionado(e.target.value)}
      >
        <option value="">Selecione o cliente…</option>
        {sugestoes.map(({ item, pontuacao }) => (
          <option key={item.id} value={item.id}>
            {item.nome_completo || '(sem nome)'}
            {pontuacao >= 0.4 ? ' — sugerido' : ''}
          </option>
        ))}
      </select>

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
                    <p className="text-xs text-muted-foreground truncate">
                      {cliente?.nome_completo || 'Cliente não encontrado'}
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
