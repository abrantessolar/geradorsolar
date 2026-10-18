import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Receipt, Download, Loader2 } from 'lucide-react';
import { gerarEBaixarImagemFatura } from '@/monitoramento/lib/gerarImagemFatura';
import ArteFatura, { type DadosArteFatura } from '@/monitoramento/components/ArteFatura';

// Versão AVULSA (sem usina) do relatório "Quanto sua casa consumiu?" —
// Fase 4, pedido do usuário em 2026-10-17: "quero uma ferramenta, onde a
// gente entra o nome do cliente, periodo de analise, e geracao solar".
//
// Mesmo formulário/mesmos campos da versão integrada ao Monitoramento
// (FaturaUsina.tsx — dentro de uma usina, com histórico salvo em
// mon_faturas e geração puxada automaticamente de mon_diario), confirmado
// com o usuário via pergunta de esclarecimento: "Precisa de todos os
// campos". A diferença é que aqui NADA é salvo no banco e a geração
// solar também é digitada manualmente (não tem usina pra buscar em
// mon_diario) — serve pra quando ainda não existe usina cadastrada pro
// cliente, ou é só uma simulação pontual. Por isso não existe "número da
// conta" (sequência de histórico); ArteFatura aceita numeroConta: null
// nesse caso e o header mostra só nome · período.

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

export default function ContaDeLuzFerramentaPage() {
  const [clienteNome, setClienteNome] = useState('');
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFim, setPeriodoFim] = useState('');
  const [geracao, setGeracao] = useState('');
  const [consumoConcessionaria, setConsumoConcessionaria] = useState('');
  const [energiaInjetada, setEnergiaInjetada] = useState('');
  const [saldoMes, setSaldoMes] = useState('');
  const [saldoAcumulado, setSaldoAcumulado] = useState('');
  // Opcional — quando em branco, o relatório mostra "—" na seção
  // financeira (quanto pagou / sem solar / economia) em vez do valor.
  const [tarifa, setTarifa] = useState('');
  const [gerando, setGerando] = useState(false);

  const arteRef = useRef<HTMLDivElement>(null);
  const [dadosArte, setDadosArte] = useState<DadosArteFatura | null>(null);

  const geracaoNum = parseNumero(geracao);
  const consumoConcessionariaNum = parseNumero(consumoConcessionaria);
  const energiaInjetadaNum = parseNumero(energiaInjetada);
  const saldoMesNum = parseNumero(saldoMes);
  const saldoAcumuladoNum = parseNumero(saldoAcumulado);
  const tarifaNum = parseNumero(tarifa);

  // Pré-visualização dos valores derivados (mesmas fórmulas de
  // lib/faturas.ts / FaturaUsina.tsx): simultaneidade = geração −
  // injetada; consumo real = concessionária + simultaneidade.
  const consumoSimultaneidadePrevia =
    geracaoNum != null && energiaInjetadaNum != null ? geracaoNum - energiaInjetadaNum : null;
  const consumoRealCasaPrevia =
    consumoSimultaneidadePrevia != null && consumoConcessionariaNum != null
      ? consumoSimultaneidadePrevia + consumoConcessionariaNum
      : null;
  const percentualSolarDiretoPrevia =
    consumoSimultaneidadePrevia != null && consumoRealCasaPrevia != null && consumoRealCasaPrevia > 0
      ? (consumoSimultaneidadePrevia / consumoRealCasaPrevia) * 100
      : null;

  const valoresNegativos =
    (geracaoNum != null && geracaoNum < 0) ||
    (consumoConcessionariaNum != null && consumoConcessionariaNum < 0) ||
    (energiaInjetadaNum != null && energiaInjetadaNum < 0) ||
    (saldoMesNum != null && saldoMesNum < 0) ||
    (saldoAcumuladoNum != null && saldoAcumuladoNum < 0) ||
    (tarifaNum != null && tarifaNum < 0);

  const injetadaMaiorQueGeracao = geracaoNum != null && energiaInjetadaNum != null && energiaInjetadaNum > geracaoNum;

  const erroValidacao = valoresNegativos
    ? 'Nenhum valor pode ser negativo.'
    : injetadaMaiorQueGeracao
      ? 'A energia injetada não pode ser maior que a geração solar do período.'
      : null;

  const formValido =
    clienteNome.trim() !== '' &&
    periodoInicio &&
    periodoFim &&
    periodoInicio <= periodoFim &&
    geracaoNum != null &&
    consumoConcessionariaNum != null &&
    energiaInjetadaNum != null &&
    saldoMesNum != null &&
    saldoAcumuladoNum != null &&
    !erroValidacao;

  const gerarImagem = async () => {
    if (erroValidacao) {
      toast.error(erroValidacao);
      return;
    }
    if (
      !formValido ||
      geracaoNum == null ||
      consumoConcessionariaNum == null ||
      energiaInjetadaNum == null ||
      saldoMesNum == null ||
      saldoAcumuladoNum == null
    ) {
      toast.error('Preencha todos os campos antes de gerar.');
      return;
    }
    const consumoSimultaneidade = geracaoNum - energiaInjetadaNum;
    const consumoRealCasa = consumoSimultaneidade + consumoConcessionariaNum;

    const dados: DadosArteFatura = {
      clienteNome: clienteNome.trim(),
      numeroConta: null,
      periodoLabel: formatarPeriodoLabel(periodoInicio, periodoFim),
      geracaoKwh: geracaoNum,
      consumoConcessionariaKwh: consumoConcessionariaNum,
      consumoRealCasaKwh: consumoRealCasa,
      consumoSimultaneidadeKwh: consumoSimultaneidade,
      energiaInjetadaKwh: energiaInjetadaNum,
      saldoMesKwh: saldoMesNum,
      saldoAcumuladoKwh: saldoAcumuladoNum,
      tarifaKwh: tarifaNum,
    };

    setGerando(true);
    try {
      setDadosArte(dados);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      if (!arteRef.current) throw new Error('Não foi possível montar a arte da imagem.');
      await gerarEBaixarImagemFatura(arteRef.current, `${dados.clienteNome}_conta_de_luz`);
      setDadosArte(null);
    } catch (e: any) {
      toast.error('Erro ao gerar imagem: ' + e.message);
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
        <Receipt className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Conta de Luz — Quanto sua casa consumiu?</h1>
          <p className="text-sm text-muted-foreground">
            Gera o relatório em imagem a partir dos dados digitados, sem precisar de uma usina cadastrada.
          </p>
        </div>
      </div>

      <div className="solar-card p-5 mb-6 space-y-3">
        <label className="block text-sm font-medium">
          Nome do cliente
          <input
            type="text"
            className="solar-input mt-1 w-full"
            value={clienteNome}
            onChange={(e) => setClienteNome(e.target.value)}
            placeholder="Ex: Maria da Silva"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-medium">
            Início do período
            <input
              type="date"
              className="solar-input mt-1 w-full"
              value={periodoInicio}
              onChange={(e) => setPeriodoInicio(e.target.value)}
            />
          </label>
          <label className="text-sm font-medium">
            Fim do período
            <input
              type="date"
              className="solar-input mt-1 w-full"
              value={periodoFim}
              onChange={(e) => setPeriodoFim(e.target.value)}
            />
          </label>
        </div>

        <label className="block text-sm font-medium">
          Geração solar (kWh)
          <input
            type="text"
            inputMode="decimal"
            className="solar-input mt-1 w-full"
            value={geracao}
            onChange={(e) => setGeracao(e.target.value)}
          />
        </label>

        <p className="text-xs font-medium text-muted-foreground pt-1">Dados da fatura (digite a partir da conta física):</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-medium">
            Consumo da concessionária (kWh)
            <input
              type="text"
              inputMode="decimal"
              className="solar-input mt-1 w-full"
              value={consumoConcessionaria}
              onChange={(e) => setConsumoConcessionaria(e.target.value)}
            />
          </label>
          <label className="text-sm font-medium">
            Energia injetada (kWh)
            <input
              type="text"
              inputMode="decimal"
              className="solar-input mt-1 w-full"
              value={energiaInjetada}
              onChange={(e) => setEnergiaInjetada(e.target.value)}
            />
          </label>
          <label className="text-sm font-medium">
            Saldo do mês (kWh)
            <input
              type="text"
              inputMode="decimal"
              className="solar-input mt-1 w-full"
              value={saldoMes}
              onChange={(e) => setSaldoMes(e.target.value)}
            />
          </label>
          <label className="text-sm font-medium">
            Saldo acumulado (kWh)
            <input
              type="text"
              inputMode="decimal"
              className="solar-input mt-1 w-full"
              value={saldoAcumulado}
              onChange={(e) => setSaldoAcumulado(e.target.value)}
            />
          </label>
          <label className="text-sm font-medium col-span-2">
            Tarifa R$/kWh (opcional)
            <input
              type="text"
              inputMode="decimal"
              placeholder="ex: 0,95"
              className="solar-input mt-1 w-full"
              value={tarifa}
              onChange={(e) => setTarifa(e.target.value)}
            />
          </label>
        </div>
        <p className="text-xs text-muted-foreground -mt-1">
          Se informada, o relatório mostra quanto o cliente pagou, quanto pagaria sem energia solar e a economia estimada.
        </p>

        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="rounded-lg border border-border bg-muted/30 p-2">
            <p className="text-[11px] text-muted-foreground">Simultaneidade (calculado)</p>
            <p className="text-sm font-semibold">
              {consumoSimultaneidadePrevia != null ? `${consumoSimultaneidadePrevia.toFixed(1)} kWh` : '—'}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-2">
            <p className="text-[11px] text-muted-foreground">Consumo real da casa (calculado)</p>
            <p className="text-sm font-semibold">
              {consumoRealCasaPrevia != null ? `${consumoRealCasaPrevia.toFixed(1)} kWh` : '—'}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-2">
            <p className="text-[11px] text-muted-foreground">% direto do solar (calculado)</p>
            <p className="text-sm font-semibold">
              {percentualSolarDiretoPrevia != null ? `${percentualSolarDiretoPrevia.toFixed(0)}%` : '—'}
            </p>
          </div>
        </div>

        {erroValidacao && <p className="text-xs text-destructive font-medium">{erroValidacao}</p>}

        <button
          onClick={gerarImagem}
          disabled={!formValido || gerando}
          className="solar-btn-primary w-full py-3 flex items-center justify-center gap-2 font-semibold disabled:opacity-50"
        >
          {gerando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {gerando ? 'Gerando...' : 'Gerar e baixar imagem'}
        </button>
      </div>

      {/* Arte renderizada fora da tela só durante a captura (ver gerarImagem) */}
      {dadosArte && (
        <div style={{ position: 'fixed', left: -99999, top: 0 }}>
          <ArteFatura ref={arteRef} {...dadosArte} />
        </div>
      )}
    </div>
  );
}
