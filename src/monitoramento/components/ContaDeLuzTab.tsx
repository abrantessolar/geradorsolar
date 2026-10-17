import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Receipt, Search, Zap, MapPin } from 'lucide-react';
import { listarUsinasVinculadas, listarClientesParaVinculo } from '../lib/usinas';
import { normalizar } from '../lib/similaridade';
import FaturaUsina from './FaturaUsina';
import type { ClienteBaseResumo, MonUsina } from '../types';

// Segundo atalho pra ferramenta de conta de luz (Fase 4, 2026-10-17) —
// além do botão dentro de cada usina em "Saúde da frota" (PainelSaude),
// esta aba deixa escolher a usina/cliente direto por busca, sem precisar
// achar a usina na lista de saúde primeiro. Pedido do usuário: "pode ter
// mais de um atalho pra chamar essa ferramenta/pagina".

const MARCA_LABEL: Record<string, string> = {
  foxess: 'FoxESS',
  solarman: 'Solarman',
  solis: 'Solis',
  sofarcloud: 'SofarCloud',
  hoymiles: 'Hoymiles',
};

export default function ContaDeLuzTab() {
  const [loading, setLoading] = useState(true);
  const [usinas, setUsinas] = useState<MonUsina[]>([]);
  const [clientes, setClientes] = useState<ClienteBaseResumo[]>([]);
  const [busca, setBusca] = useState('');
  const [usinaSelecionada, setUsinaSelecionada] = useState<MonUsina | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [u, c] = await Promise.all([listarUsinasVinculadas(), listarClientesParaVinculo()]);
        setUsinas(u);
        setClientes(c);
      } catch (e: any) {
        toast.error('Erro ao carregar usinas: ' + e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const clientesPorId = useMemo(() => {
    const m = new Map<string, ClienteBaseResumo>();
    clientes.forEach((c) => m.set(c.id, c));
    return m;
  }, [clientes]);

  const termo = normalizar(busca);
  const resultados = useMemo(() => {
    if (!termo) return usinas.slice(0, 30);
    return usinas
      .filter((u) => {
        const cliente = u.cliente_base_id ? clientesPorId.get(u.cliente_base_id) : undefined;
        return (
          normalizar(cliente?.nome_completo).includes(termo) ||
          normalizar(u.cidade).includes(termo) ||
          normalizar(u.modelo).includes(termo)
        );
      })
      .slice(0, 30);
  }, [termo, usinas, clientesPorId]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (usinaSelecionada) {
    const cliente = usinaSelecionada.cliente_base_id ? clientesPorId.get(usinaSelecionada.cliente_base_id) : undefined;
    return (
      <div className="space-y-3">
        <button onClick={() => setUsinaSelecionada(null)} className="text-sm text-primary hover:underline">
          ← Escolher outra usina
        </button>
        <div className="solar-card p-4">
          <h3 className="font-bold flex items-center gap-2 mb-1">
            <Receipt className="w-4 h-4" /> {cliente?.nome_completo || 'Cliente'}
          </h3>
          <p className="text-xs text-muted-foreground mb-2">
            {MARCA_LABEL[usinaSelecionada.marca] ?? usinaSelecionada.marca} — {usinaSelecionada.modelo || usinaSelecionada.sn_inversor}
            {usinaSelecionada.cidade ? ` • ${usinaSelecionada.cidade}` : ''}
          </p>
          <FaturaUsina usinaId={usinaSelecionada.id} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-primary flex items-center gap-2">
        <Receipt className="w-5 h-5" /> Conta de luz — "Quanto sua casa consumiu?"
      </h2>
      <p className="text-sm text-muted-foreground">
        Escolha a usina/cliente pra lançar uma conta de luz e gerar o relatório.
      </p>

      <div className="relative max-w-md">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          className="solar-input text-sm py-2 pl-8 pr-2 w-full"
          placeholder="Buscar por cliente, cidade ou modelo…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        {resultados.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma usina encontrada.</p>}
        {resultados.map((usina) => {
          const cliente = usina.cliente_base_id ? clientesPorId.get(usina.cliente_base_id) : undefined;
          return (
            <button
              key={usina.id}
              onClick={() => setUsinaSelecionada(usina)}
              className="w-full flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/60 text-left"
            >
              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="font-medium truncate">{cliente?.nome_completo || 'Cliente não encontrado'}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                  {MARCA_LABEL[usina.marca] ?? usina.marca} — {usina.modelo || usina.sn_inversor}
                  {usina.cidade && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" /> {usina.cidade}
                    </span>
                  )}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
