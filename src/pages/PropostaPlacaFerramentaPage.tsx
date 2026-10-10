import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Sun, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getSettings } from '@/data/store';
import { lookupIrradiation } from '@/data/store';
import { calcCardInstallments } from '@/data/calculations';
import { SEASONAL_FACTORS, MONTH_KEYS, BRAZILIAN_STATES } from '@/data/types';
import { criarPropostaPlacaDB } from '@/data/supabasePropostaPlaca';
import { useAuth } from '@/contexts/AuthContext';

interface PlacaOpcao { id: string; brand: string; model: string; power: number }
interface Vendedor { user_id: string; nome: string; telefone: string | null; role: string }

export default function PropostaPlacaFerramentaPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [placas, setPlacas] = useState<PlacaOpcao[]>([]);
  const [placaId, setPlacaId] = useState('');
  const [qtd, setQtd] = useState(10);
  const [clienteNome, setClienteNome] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('MS');
  const [telefone, setTelefone] = useState('');
  const [precoAvista, setPrecoAvista] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [gerando, setGerando] = useState(false);

  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [responsavelNome, setResponsavelNome] = useState('');

  useEffect(() => {
    supabase.from('user_profiles').select('user_id, nome, telefone, role, ativo')
      .in('role', ['vendedor', 'orcamentista', 'admin', 'gestor']).eq('ativo', true).order('nome')
      .then(({ data, error }) => {
        if (error) return;
        const lista = (data || []) as Vendedor[];
        setVendedores(lista);
        if (!responsavelNome && lista.length > 0) {
          const proprio = profile ? lista.find(v => v.user_id === profile.user_id) : null;
          setResponsavelNome(proprio?.nome || lista[0].nome);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const responsavelSelecionado = vendedores.find(v => v.nome === responsavelNome) || null;

  useEffect(() => {
    supabase.from('equipamentos_placas' as any).select('*').eq('ativo', true).order('marca').order('modelo')
      .then(({ data, error }) => {
        if (error) { toast.error('Erro ao carregar placas: ' + error.message); return; }
        const opcoes = ((data || []) as any[]).map(p => ({ id: p.id, brand: p.marca, model: p.modelo, power: Number(p.potencia_wp) || 0 }));
        setPlacas(opcoes);
        setPlacaId(prev => prev || opcoes[0]?.id || '');
      });
  }, []);

  const placaSelecionada = placas.find(p => p.id === placaId) || null;
  const potenciaKwp = placaSelecionada ? (placaSelecionada.power / 1000) * qtd : 0;

  const irr = useMemo(() => (cidade.trim() ? lookupIrradiation(uf, cidade.trim()) : null), [cidade, uf]);

  const geracaoMensal = useMemo(() => {
    if (potenciaKwp <= 0) return null;
    const settings = getSettings();
    const perda = 1 - (settings.systemLoss || 0) / 100;
    if (irr?.found && irr.monthly) {
      return irr.monthly.map(hsp => potenciaKwp * hsp * 30 * perda);
    }
    const media = irr?.value ?? 4.8; // fallback conservador se a cidade não estiver na base
    return MONTH_KEYS.map(k => potenciaKwp * media * SEASONAL_FACTORS[k] * 30 * perda);
  }, [potenciaKwp, irr]);

  const geracaoMedia = geracaoMensal ? geracaoMensal.reduce((a, b) => a + b, 0) / 12 : null;

  const precoNum = parseFloat(precoAvista.replace(/\./g, '').replace(',', '.')) || 0;
  const cartao = useMemo(() => {
    if (precoNum <= 0) return null;
    const settings = getSettings();
    const resultado = calcCardInstallments(precoNum, settings.creditCardRates);
    return [3, 6, 12, 18]
      .map(n => resultado[n] ? { meses: n, valor: resultado[n].perMonth } : null)
      .filter((x): x is { meses: number; valor: number } => x !== null);
  }, [precoNum]);

  const gerar = async () => {
    if (!clienteNome.trim()) { toast.error('Informe o nome do cliente.'); return; }
    if (!placaSelecionada) { toast.error('Selecione a placa.'); return; }
    if (precoNum <= 0) { toast.error('Informe o preço à vista.'); return; }
    setGerando(true);
    try {
      const { codigoAcesso } = await criarPropostaPlacaDB({
        clienteNome: clienteNome.trim(), clienteCidade: cidade.trim() || undefined, clienteUf: uf,
        clienteTelefone: telefone.trim() || undefined,
        responsavelNome: responsavelNome || undefined, responsavelTelefone: responsavelSelecionado?.telefone || undefined,
        placaId: placaSelecionada.id, placaMarca: placaSelecionada.brand, placaModelo: placaSelecionada.model,
        placaPotenciaWp: placaSelecionada.power, placaImagem: null,
        qtdPlacas: qtd, potenciaKwp,
        geracaoMensalKwh: geracaoMensal, geracaoMediaKwh: geracaoMedia,
        precoAvista: precoNum, cartaoParcelas: cartao,
        observacoes: observacoes.trim() || undefined,
      });
      toast.success('Proposta gerada!');
      navigate(`/proposta-placa/${codigoAcesso}`);
    } catch (e: any) {
      toast.error('Erro ao gerar proposta: ' + (e?.message || e));
    } finally {
      setGerando(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <Link to="/ferramentas" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Ferramentas
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <Sun className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Proposta de Placa Avulsa</h1>
          <p className="text-sm text-muted-foreground">Venda de módulos fotovoltaicos, sem inversor</p>
        </div>
      </div>

      <div className="solar-card p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Nome do cliente</label>
          <input className="solar-input" value={clienteNome} onChange={e => setClienteNome(e.target.value)} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1.5">Cidade (pra geração real)</label>
            <input className="solar-input" value={cidade} onChange={e => setCidade(e.target.value)} placeholder="Três Lagoas" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">UF</label>
            <select className="solar-input" value={uf} onChange={e => setUf(e.target.value)}>
              {BRAZILIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        {cidade.trim() && (
          <p className="text-xs text-muted-foreground -mt-2">
            {irr?.found ? '✓ Irradiação real encontrada pra essa cidade.' : '⚠ Cidade não encontrada na base — usando estimativa por sazonalidade.'}
          </p>
        )}

        <div>
          <label className="block text-sm font-medium mb-1.5">Telefone (opcional)</label>
          <input className="solar-input" value={telefone} onChange={e => setTelefone(e.target.value)} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Responsável pela proposta</label>
          <select className="solar-input" value={responsavelNome} onChange={e => setResponsavelNome(e.target.value)}>
            {vendedores.length === 0 && <option value="">Carregando...</option>}
            {vendedores.map(v => <option key={v.user_id} value={v.nome}>{v.nome}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Placa</label>
          <select className="solar-input" value={placaId} onChange={e => setPlacaId(e.target.value)}>
            <option value="">Selecione...</option>
            {placas.map(p => <option key={p.id} value={p.id}>{p.brand} {p.model} — {p.power} Wp</option>)}
          </select>
          {placas.length === 0 && <p className="text-xs text-muted-foreground mt-1">Nenhuma placa ativa cadastrada (Admin → Equipamentos → Placas).</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Quantidade de placas</label>
          <input type="number" min={1} className="solar-input" value={qtd} onChange={e => setQtd(parseInt(e.target.value) || 1)} />
          {potenciaKwp > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {potenciaKwp.toFixed(2)} kWp · geração média da proposta: {geracaoMedia ? `${geracaoMedia.toFixed(0)} kWh/mês` : '—'}
              {geracaoMedia && qtd > 0 && ` · geração média por placa: ${(geracaoMedia / qtd).toFixed(0)} kWh/mês`}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Preço à vista (R$)</label>
          <input type="text" inputMode="decimal" className="solar-input" value={precoAvista} onChange={e => setPrecoAvista(e.target.value)} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Observações (opcional)</label>
          <textarea className="solar-input min-h-[70px]" value={observacoes} onChange={e => setObservacoes(e.target.value)} />
        </div>

        <button onClick={gerar} disabled={gerando} className="solar-btn-primary w-full py-3 flex items-center justify-center gap-2 font-semibold">
          {gerando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sun className="w-4 h-4" />}
          {gerando ? 'Gerando...' : 'Gerar proposta'}
        </button>
      </div>
    </div>
  );
}
