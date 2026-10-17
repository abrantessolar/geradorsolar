import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Receipt, Download, Loader2, FileImage } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  listarFaturasUsina,
  proximoNumeroConta,
  somarGeracaoPeriodo,
  criarFatura,
} from '../lib/faturas';
import { obterUsina, obterClienteBase } from '../lib/usinas';
import { gerarEBaixarImagemFatura } from '../lib/gerarImagemFatura';
import ArteFatura, { type DadosArteFatura } from './ArteFatura';
import type { MonFatura, MonUsina } from '../types';

// Ferramenta de pós-venda "Quanto sua casa consumiu?" (Fase 4,
// 2026-10-17) — gera o relatório/imagem de uma conta de luz: a geração
// solar vem de mon_diario (somatório do período de faturamento, igual
// ao modo "Período personalizado" de HistoricoUsina.tsx); o resto
// (consumo da concessionária, energia injetada, saldo do mês/acumulado)
// é digitado a partir da fatura física do cliente. Cada lançamento fica
// salvo (1ª, 2ª, 3ª conta...) pra formar histórico por usina/cliente.
//
// Por enquanto só dá pra abrir manualmente (daqui, ou do atalho dentro
// de "Saúde da frota" — ver PainelSaude.tsx); entrar automaticamente no
// funil quando pedir a Xª conta é passo futuro, combinado com o usuário.

function formatarDataCurta(iso: string): string {
  if (!iso) return '';
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

function formatarPeriodoLabel(inicio: string, fim: string): string {
  if (!inicio || !fim) return '';
  const [, mesI, diaI] = inicio.split('-');
  return `${diaI}/${mesI} a ${formatarDataCurta(fim)}`;
}

function parseNumero(valor: string): number | null {
  if (valor.trim() === '') return null;
  const n = Number(valor.replace(',', '.'));
  return Number.isNaN(n) ? null : n;
}

export default function FaturaUsina({ usinaId }: { usinaId: string }) {
  const { session } = useAuth();
  const usuarioId: string | null = session?.user?.id ?? null;

  const [usina, setUsina] = useState<MonUsina | null>(null);
  const [clienteNome, setClienteNome] = useState<string>('');
  const [faturas, setFaturas] = useState<MonFatura[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);

  // Formulário
  const [numeroConta, setNumeroConta] = useState<number>(1);
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFim, setPeriodoFim] = useState('');
  const [geracaoKwh, setGeracaoKwh] = useState<number | null>(null);
  const [buscandoGeracao, setBuscandoGeracao] = useState(false);
  const [consumoConcessionaria, setConsumoConcessionaria] = useState('');
  const [energiaInjetada, setEnergiaInjetada] = useState('');
  const [saldoMes, setSaldoMes] = useState('');
  const [saldoAcumulado, setSaldoAcumulado] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [gerandoImagemId, setGerandoImagemId] = useState<string | null>(null);

  const arteRef = useRef<HTMLDivElement>(null);
  const [dadosArte, setDadosArte] = useState<DadosArteFatura | null>(null);

  const carregar = async () => {
    setLoading(true);
    try {
      const [u, fs] = await Promise.all([obterUsina(usinaId), listarFaturasUsina(usinaId)]);
      setUsina(u);
      setFaturas(fs);
      if (u?.cliente_base_id) {
        const c = await obterClienteBase(u.cliente_base_id);
        setClienteNome(c?.nome_completo || 'Cliente');
      } else {
        setClienteNome('(sem cliente vinculado)');
      }
      const proximo = await proximoNumeroConta(usinaId);
      setNumeroConta(proximo);
    } catch (e: any) {
      toast.error('Erro ao carregar contas de luz: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usinaId]);

  // Busca a geração do período assim que início e fim estiverem
  // preenchidos — mesma fonte usada no histórico (mon_diario).
  useEffect(() => {
    if (!periodoInicio || !periodoFim || periodoInicio > periodoFim) {
      setGeracaoKwh(null);
      return;
    }
    let ativo = true;
    setBuscandoGeracao(true);
    somarGeracaoPeriodo(usinaId, periodoInicio, periodoFim)
      .then((v) => ativo && setGeracaoKwh(v))
      .catch((e: any) => ativo && toast.error('Erro ao buscar geração do período: ' + e.message))
      .finally(() => ativo && setBuscandoGeracao(false));
    return () => {
      ativo = false;
    };
  }, [usinaId, periodoInicio, periodoFim]);

  const consumoConcessionariaNum = parseNumero(consumoConcessionaria);
  const energiaInjetadaNum = parseNumero(energiaInjetada);
  const saldoMesNum = parseNumero(saldoMes);
  const saldoAcumuladoNum = parseNumero(saldoAcumulado);

  // Pré-visualização dos valores derivados, calculados ao vivo conforme
  // o usuário digita (mesma fórmula gravada em lib/faturas.ts).
  const consumoSimultaneidadePrevia = useMemo(() => {
    if (geracaoKwh == null || energiaInjetadaNum == null) return null;
    return geracaoKwh - energiaInjetadaNum;
  }, [geracaoKwh, energiaInjetadaNum]);

  const consumoRealCasaPrevia = useMemo(() => {
    if (consumoSimultaneidadePrevia == null || consumoConcessionariaNum == null) return null;
    return consumoSimultaneidadePrevia + consumoConcessionariaNum;
  }, [consumoSimultaneidadePrevia, consumoConcessionariaNum]);

  const formValido =
    periodoInicio &&
    periodoFim &&
    periodoInicio <= periodoFim &&
    geracaoKwh != null &&
    consumoConcessionariaNum != null &&
    energiaInjetadaNum != null &&
    saldoMesNum != null &&
    saldoAcumuladoNum != null;

  const montarDadosArte = (f: MonFatura, nomeCliente: string): DadosArteFatura => ({
    clienteNome: nomeCliente,
    numeroConta: f.numero_conta,
    periodoLabel: formatarPeriodoLabel(f.periodo_inicio, f.periodo_fim),
    geracaoKwh: f.geracao_kwh,
    consumoConcessionariaKwh: f.consumo_concessionaria_kwh,
    consumoRealCasaKwh: f.consumo_real_casa_kwh,
    consumoSimultaneidadeKwh: f.consumo_simultaneidade_kwh,
    energiaInjetadaKwh: f.energia_injetada_kwh,
    saldoMesKwh: f.saldo_mes_kwh,
    saldoAcumuladoKwh: f.saldo_acumulado_kwh,
  });

  // A arte (ArteFatura) é renderizada fora da tela só no momento de
  // gerar a imagem — monta com os dados, espera o próximo frame (garante
  // que o DOM/fontes já aplicaram) e captura com html2canvas.
  const capturarEBaixar = async (dados: DadosArteFatura) => {
    setDadosArte(dados);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    if (!arteRef.current) throw new Error('Não foi possível montar a arte da imagem.');
    await gerarEBaixarImagemFatura(arteRef.current, `${dados.clienteNome}_conta_${dados.numeroConta}`);
    setDadosArte(null);
  };

  const salvarEGerar = async () => {
    if (!formValido || geracaoKwh == null || consumoConcessionariaNum == null || energiaInjetadaNum == null || saldoMesNum == null || saldoAcumuladoNum == null) {
      toast.error('Preencha todos os campos antes de salvar.');
      return;
    }
    setSalvando(true);
    try {
      const fatura = await criarFatura({
        usina_id: usinaId,
        cliente_base_id: usina?.cliente_base_id ?? null,
        numero_conta: numeroConta,
        periodo_inicio: periodoInicio,
        periodo_fim: periodoFim,
        geracao_kwh: geracaoKwh,
        consumo_concessionaria_kwh: consumoConcessionariaNum,
        energia_injetada_kwh: energiaInjetadaNum,
        saldo_mes_kwh: saldoMesNum,
        saldo_acumulado_kwh: saldoAcumuladoNum,
        criado_por: usuarioId,
      });
      toast.success(`${numeroConta}ª conta salva.`);
      await capturarEBaixar(montarDadosArte(fatura, clienteNome));
      setMostrarForm(false);
      setConsumoConcessionaria('');
      setEnergiaInjetada('');
      setSaldoMes('');
      setSaldoAcumulado('');
      setPeriodoInicio('');
      setPeriodoFim('');
      setGeracaoKwh(null);
      await carregar();
    } catch (e: any) {
      toast.error('Erro ao salvar conta: ' + e.message);
    } finally {
      setSalvando(false);
    }
  };

  const baixarNovamente = async (f: MonFatura) => {
    setGerandoImagemId(f.id);
    try {
      await capturarEBaixar(montarDadosArte(f, clienteNome));
    } catch (e: any) {
      toast.error('Erro ao gerar imagem: ' + e.message);
    } finally {
      setGerandoImagemId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="pt-2 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">
          {faturas.length === 0 ? 'Nenhuma conta lançada ainda pra essa usina.' : `${faturas.length} conta(s) lançada(s).`}
        </p>
        {!mostrarForm && (
          <button
            onClick={() => setMostrarForm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Receipt className="w-3.5 h-3.5" /> Nova conta de luz
          </button>
        )}
      </div>

      {mostrarForm && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <label className="text-xs text-muted-foreground">
              Nº da conta
              <input
                type="number"
                min={1}
                className="solar-input text-sm py-1.5 px-2 w-full mt-1"
                value={numeroConta}
                onChange={(e) => setNumeroConta(Number(e.target.value))}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Início do período
              <input
                type="date"
                className="solar-input text-sm py-1.5 px-2 w-full mt-1"
                value={periodoInicio}
                onChange={(e) => setPeriodoInicio(e.target.value)}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Fim do período
              <input
                type="date"
                className="solar-input text-sm py-1.5 px-2 w-full mt-1"
                value={periodoFim}
                onChange={(e) => setPeriodoFim(e.target.value)}
              />
            </label>
            <div className="text-xs text-muted-foreground">
              Geração solar (automática)
              <div className="solar-input text-sm py-1.5 px-2 w-full mt-1 bg-muted/60 flex items-center gap-1.5">
                {buscandoGeracao ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : geracaoKwh != null ? (
                  `${geracaoKwh.toFixed(1)} kWh`
                ) : (
                  '—'
                )}
              </div>
            </div>
          </div>

          <p className="text-xs font-medium text-muted-foreground pt-1">Dados da fatura (digite a partir da conta física):</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <label className="text-xs text-muted-foreground">
              Consumo da concessionária (kWh)
              <input
                type="text"
                inputMode="decimal"
                className="solar-input text-sm py-1.5 px-2 w-full mt-1"
                value={consumoConcessionaria}
                onChange={(e) => setConsumoConcessionaria(e.target.value)}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Energia injetada (kWh)
              <input
                type="text"
                inputMode="decimal"
                className="solar-input text-sm py-1.5 px-2 w-full mt-1"
                value={energiaInjetada}
                onChange={(e) => setEnergiaInjetada(e.target.value)}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Saldo do mês (kWh)
              <input
                type="text"
                inputMode="decimal"
                className="solar-input text-sm py-1.5 px-2 w-full mt-1"
                value={saldoMes}
                onChange={(e) => setSaldoMes(e.target.value)}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Saldo acumulado (kWh)
              <input
                type="text"
                inputMode="decimal"
                className="solar-input text-sm py-1.5 px-2 w-full mt-1"
                value={saldoAcumulado}
                onChange={(e) => setSaldoAcumulado(e.target.value)}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="rounded-lg border border-border bg-background p-2">
              <p className="text-[11px] text-muted-foreground">Consumo em simultaneidade (calculado)</p>
              <p className="text-sm font-semibold">{consumoSimultaneidadePrevia != null ? `${consumoSimultaneidadePrevia.toFixed(1)} kWh` : '—'}</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-2">
              <p className="text-[11px] text-muted-foreground">Consumo real da casa (calculado)</p>
              <p className="text-sm font-semibold">{consumoRealCasaPrevia != null ? `${consumoRealCasaPrevia.toFixed(1)} kWh` : '—'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={salvarEGerar}
              disabled={!formValido || salvando}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Salvar e baixar imagem
            </button>
            <button onClick={() => setMostrarForm(false)} className="text-sm text-muted-foreground hover:text-foreground">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {faturas.length > 0 && (
        <div className="space-y-1.5">
          {faturas.map((f) => (
            <div key={f.id} className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-border bg-muted/20 text-sm">
              <div className="min-w-0">
                <p className="font-medium">{f.numero_conta}ª conta — {formatarPeriodoLabel(f.periodo_inicio, f.periodo_fim)}</p>
                <p className="text-xs text-muted-foreground">
                  Geração {f.geracao_kwh.toFixed(1)} kWh • Consumo real {f.consumo_real_casa_kwh.toFixed(1)} kWh • Saldo acumulado{' '}
                  {f.saldo_acumulado_kwh.toFixed(1)} kWh
                </p>
              </div>
              <button
                onClick={() => baixarNovamente(f)}
                disabled={gerandoImagemId === f.id}
                className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-muted hover:bg-muted/70 disabled:opacity-50"
              >
                {gerandoImagemId === f.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileImage className="w-3.5 h-3.5" />}
                Baixar imagem
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Arte renderizada fora da tela só durante a captura (ver capturarEBaixar) */}
      {dadosArte && (
        <div style={{ position: 'fixed', left: -99999, top: 0 }}>
          <ArteFatura ref={arteRef} {...dadosArte} />
        </div>
      )}
    </div>
  );
}
