// Motor compartilhado de dimensionamento — Backup / Offgrid / Bombeamento
// Lógica fechada em conversa com o cliente (ver ANALISE DE LOGICA DE SITE).

export type Quimica = 'litio' | 'chumbo';

export interface Carga {
  id: string;
  nome: string;
  potenciaW: number;
  horasDia: number;
}

export const CARGAS_SUGERIDAS: Omit<Carga, 'id'>[] = [
  { nome: 'Geladeira', potenciaW: 150, horasDia: 24 },
  { nome: 'Roteador', potenciaW: 15, horasDia: 24 },
  { nome: 'TV', potenciaW: 100, horasDia: 4 },
  { nome: 'Câmera de segurança', potenciaW: 15, horasDia: 24 },
  { nome: 'DVR', potenciaW: 20, horasDia: 24 },
  { nome: 'Starlink', potenciaW: 50, horasDia: 24 },
  { nome: 'Lâmpada LED', potenciaW: 10, horasDia: 5 },
];

// DoD, Ec (eficiência de carga) e SoH — deixados exportados/editáveis por
// se tratar de premissas de negócio que podem mudar (ex: SoH 0.8 se quiser
// já prever degradação de fim de garantia em vez de sizing pro dia 1).
export const CONSTANTES_QUIMICA: Record<Quimica, { DoD: number; Ec: number; SoH: number; label: string }> = {
  litio: { DoD: 0.90, Ec: 0.95, SoH: 1.00, label: 'Lítio' },
  chumbo: { DoD: 0.25, Ec: 0.85, SoH: 1.00, label: 'Chumbo' },
};

export function novaCarga(): Carga {
  return { id: crypto.randomUUID(), nome: '', potenciaW: 0, horasDia: 0 };
}

/** Energia consumida por dia, em Wh (Ea_Wh). */
export function calcularEnergiaDiariaWh(cargas: Carga[]): number {
  return cargas.reduce((total, c) => total + (c.potenciaW || 0) * (c.horasDia || 0), 0);
}

export interface ResultadoBateria {
  energiaBancoKWh: number;
  quantidade: number;
  descricao: string;
}

/**
 * eaWh: energia diária (Wh)
 * dias: autonomia em dias (já convertida, se vier de horas: horas/24)
 */
export function calcularBateria(eaWh: number, dias: number, quimica: Quimica): ResultadoBateria {
  const { DoD, Ec, SoH } = CONSTANTES_QUIMICA[quimica];
  const energiaBancoKWh = (eaWh * dias) / (DoD * Ec * SoH) / 1000;

  if (eaWh <= 0 || dias <= 0) {
    return { energiaBancoKWh: 0, quantidade: 0, descricao: '' };
  }

  if (quimica === 'litio') {
    const pequenas = Math.ceil(energiaBancoKWh / 1.28);
    if (pequenas <= 2) {
      return { energiaBancoKWh, quantidade: pequenas, descricao: `${pequenas}x bateria de lítio 12V/100Ah` };
    }
    const grandes = Math.ceil(energiaBancoKWh / 5);
    return { energiaBancoKWh, quantidade: grandes, descricao: `${grandes}x bateria de lítio 5kWh (48V)` };
  }

  // chumbo
  const stringsPequenas = Math.ceil(energiaBancoKWh / 1.2);
  if (stringsPequenas <= 1) {
    return { energiaBancoKWh, quantidade: 2, descricao: '2x bateria de chumbo 12V/50Ah em série (banco 24V)' };
  }
  const stringsGrandes = Math.ceil(energiaBancoKWh / 5.76);
  const unidadesGrandes = stringsGrandes * 2;
  return {
    energiaBancoKWh,
    quantidade: unidadesGrandes,
    descricao: `${unidadesGrandes}x bateria de chumbo 12V/240Ah em série/paralelo (banco 24V)`,
  };
}

/** Nº mínimo de placas para o módulo Offgrid, via HSP do local. */
export function calcularPlacasOffgrid(eaWh: number, potenciaPlacaW: number, hsp: number): number {
  if (eaWh <= 0 || potenciaPlacaW <= 0 || hsp <= 0) return 0;
  const geracaoDiariaPlacaWh = potenciaPlacaW * hsp * 0.75;
  return Math.ceil(eaWh / geracaoDiariaPlacaWh);
}

/** Nº de placas (600W) para bombeamento, por CV — sempre múltiplo de 8, mínimo 8. */
export function calcularPlacasBombeamento(cv: number): number {
  if (cv <= 0) return 0;
  const bruto = cv * 2.5;
  const arredondado = Math.ceil(bruto / 8) * 8;
  return Math.max(arredondado, 8);
}

export const AVISO_VALIDACAO =
  'Esta é uma sugestão aproximada de dimensionamento. Todos os projetos devem ser validados por um especialista técnico da Três Lagoas Solar antes da execução.';
