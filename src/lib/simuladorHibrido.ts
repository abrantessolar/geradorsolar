import {
  GERACAO_HORARIA, ORDEM_DIAS, type TipoDia,
  type ItemCatalogo, type Janela,
} from '@/data/catalogoSimuladorHibrido';

/** Config por item selecionado, vinda do estado da UI (quantidade + tempo/km, quando aplicável). */
export interface ConfigItem {
  qtd: number;
  /** Tempo ligado/dia — só pra itens tipo 'tempo_ajustavel' (na unidade do próprio item: h ou min). */
  tempo?: number;
  /** Km rodados/dia — só pro item de Veículo Elétrico. */
  km?: number;
}

export function horasDaJanela(janela: Janela): number[] {
  const horas: number[] = [];
  janela.forEach(([ini, fim]) => {
    for (let h = ini; h < fim; h++) horas.push(h % 24);
  });
  return horas;
}

/** Retorna a potência média (kW) distribuída em cada hora (0-23) que o item ocupa, e o total kWh/dia. */
export function potenciaMediaPorHora(item: ItemCatalogo, config: ConfigItem): { mapa: Record<number, number>; kwhDia: number } {
  const horas = horasDaJanela(item.janela);
  const qtd = config.qtd ?? 1;

  let kwhDia: number;
  if (item.tipo === 'fixo') {
    kwhDia = item.pot * item.horas * item.fator * qtd;
  } else {
    const tempoHoras = item.unidade === 'min'
      ? (config.tempo ?? item.padrao) / 60
      : (config.tempo ?? item.padrao);
    kwhDia = item.pot * tempoHoras * qtd;
  }

  const potMediaNaJanela = horas.length > 0 ? kwhDia / horas.length : 0;
  const mapa: Record<number, number> = {};
  horas.forEach(h => { mapa[h] = (mapa[h] || 0) + potMediaNaJanela; });
  return { mapa, kwhDia };
}

export interface ItemSelecionado {
  item: ItemCatalogo;
  config: ConfigItem;
}

export interface PontoSimulacao {
  label: string;
  dia: TipoDia;
  hora: number;
  geracaoKw: number;
  consumoKw: number;
  socKwh: number;
  vindoDaRedeKwh: number;
}

export interface ResultadoSimulacao {
  pontos: PontoSimulacao[];
  /** kWh/dia por item selecionado — útil pra depurar/exibir detalhamento. */
  consumoPorItem: Record<string, number>;
  consumoDiarioTotalKwh: number;
  /** Soma da potência nominal de todos os itens selecionados, como se ligassem tudo ao mesmo tempo. */
  potenciaNominalAcumuladaKw: number;
  /** Cenário conservador: soma da potência de PICO (quando conhecida; nominal quando não) de
   *  todos os itens selecionados, como se todos partissem/ligassem simultaneamente. Útil pra
   *  garantir que o inversor aguenta o pior caso de corrente de partida acumulada. */
  picoMaximoAcumuladoKw: number;
  /** Detalhamento por item que tem potência de pico própria cadastrada (motores/compressores). */
  itensComPico: { id: string; nome: string; picoKw: number; qtd: number }[];
}

export function calcularSimulacaoHibrida(params: {
  potenciaKwp: number;
  capacidadeBateriaKwh: number;
  socInicialPct: number;
  itensSelecionados: ItemSelecionado[];
}): ResultadoSimulacao {
  const { potenciaKwp, capacidadeBateriaKwh, socInicialPct, itensSelecionados } = params;

  // Consumo hora-a-hora (0-23), somando todos os itens selecionados
  const consumoHora = Array(24).fill(0);
  const consumoPorItem: Record<string, number> = {};
  itensSelecionados.forEach(({ item, config }) => {
    const { mapa, kwhDia } = potenciaMediaPorHora(item, config);
    consumoPorItem[item.id] = kwhDia;
    for (let h = 0; h < 24; h++) consumoHora[h] += mapa[h] || 0;
  });
  const consumoDiarioTotalKwh = Object.values(consumoPorItem).reduce((a, b) => a + b, 0);

  // Potência nominal e de pico acumuladas — cenário "tudo ligado ao mesmo tempo",
  // usado pra checar se o inversor aguenta o pior caso, não pra curva hora-a-hora.
  let potenciaNominalAcumuladaKw = 0;
  let picoMaximoAcumuladoKw = 0;
  const itensComPico: { id: string; nome: string; picoKw: number; qtd: number }[] = [];
  itensSelecionados.forEach(({ item, config }) => {
    const qtd = config.qtd ?? 1;
    const nominal = item.pot * qtd;
    potenciaNominalAcumuladaKw += nominal;
    if (item.picoKw != null) {
      picoMaximoAcumuladoKw += item.picoKw * qtd;
      itensComPico.push({ id: item.id, nome: item.nome, picoKw: item.picoKw, qtd });
    } else {
      picoMaximoAcumuladoKw += nominal;
    }
  });

  // Geração hora-a-hora por tipo de dia, escalada pela potência instalada
  const geracaoHora = (tipo: TipoDia) => {
    const arr = Array(24).fill(0);
    for (let h = 0; h < 24; h++) arr[h] = (GERACAO_HORARIA[tipo][h] || 0) * potenciaKwp;
    return arr;
  };

  // Monta 72h contínuas (consumo se repete igual nos 3 dias; geração muda por dia)
  const pontosBase: { dia: TipoDia; hora: number; geracaoKw: number; consumoKw: number }[] = [];
  ORDEM_DIAS.forEach((tipo) => {
    const ger = geracaoHora(tipo);
    for (let h = 0; h < 24; h++) {
      pontosBase.push({ dia: tipo, hora: h, geracaoKw: Number(ger[h].toFixed(3)), consumoKw: Number(consumoHora[h].toFixed(3)) });
    }
  });

  // SOC da bateria hora-a-hora
  let soc = capacidadeBateriaKwh * (socInicialPct / 100);
  const pontos: PontoSimulacao[] = pontosBase.map((p, i) => {
    const saldo = p.geracaoKw - p.consumoKw; // resolução de 1h: kW == kWh na hora
    let vindoDaRede = 0;
    if (saldo >= 0) {
      soc = Math.min(capacidadeBateriaKwh, soc + saldo);
    } else {
      const falta = -saldo;
      if (soc >= falta) {
        soc -= falta;
      } else {
        vindoDaRede = falta - soc;
        soc = 0;
      }
    }
    const diaIdx = ORDEM_DIAS.indexOf(p.dia) + 1;
    return {
      label: `${diaIdx}º dia ${String(p.hora).padStart(2, '0')}h`,
      dia: p.dia,
      hora: p.hora,
      geracaoKw: p.geracaoKw,
      consumoKw: p.consumoKw,
      socKwh: Number(soc.toFixed(2)),
      vindoDaRedeKwh: Number(vindoDaRede.toFixed(2)),
    };
  });

  return { pontos, consumoPorItem, consumoDiarioTotalKwh, potenciaNominalAcumuladaKw, picoMaximoAcumuladoKw, itensComPico };
}
