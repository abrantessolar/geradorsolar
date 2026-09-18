export type TipoTensao = 'low_voltage' | 'high_voltage';
export type TensaoSaida = '127' | '220' | 'bivolt';

export interface InversorHibrido {
  id: string;
  marca: string;
  modelo: string;
  miniaturaUrl: string | null;

  potenciaNominalKw: number;
  potenciaPicoKw: number | null;
  potenciaFvMaxKwp: number | null;

  tipoTensaoBateria: TipoTensao;
  tensaoBateriaV: number | null;

  tensaoSaida: TensaoSaida;

  numMppt: number | null;
  mpptTensaoMinV: number | null;
  mpptTensaoMaxV: number | null;

  correnteMaxCargaBateriaA: number | null;
  protocoloComunicacao: string | null;
  bateriasCompativeis: string | null;

  garantiaAnos: number | null;
  ativo: boolean;
}

export interface BateriaHibrida {
  id: string;
  marca: string;
  modelo: string;
  miniaturaUrl: string | null;

  capacidadeKwh: number;
  tipoTensao: TipoTensao;
  tensaoNominalV: number | null;

  correnteMaxDescargaContinuaA: number | null;
  correnteMaxDescargaPicoA: number | null;
  dodPct: number;
  quimica: string | null;
  ciclosVida: number | null;

  empilhavel: boolean;
  maxUnidadesParalelo: number | null;

  garantiaAnos: number | null;
  ativo: boolean;
}

export const QUIMICAS_BATERIA = ['LiFePO4', 'Chumbo-ácido', 'NMC', 'Outra'];
export const PROTOCOLOS_COMUNICACAO = ['CAN', 'RS485', 'Bluetooth', 'Proprietário', 'Outro'];
export const TENSOES_LV = [12, 24, 48];
