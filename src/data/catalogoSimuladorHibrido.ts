// ────────────────────────────────────────────────────────────
// Dados do Simulador Híbrido (3 dias: nublado / típico / limpo)
//
// Isolado de propósito do EQUIPMENT_CATALOG (src/data/types.ts) e do
// equipamentos_calculadora (Supabase/Admin) — aqueles calculam total
// mensal (kWh/mês); este calcula curva HORA A HORA, que precisa de
// janela de uso por equipamento. São modelos de dado incompatíveis.
//
// Nota pra próxima sessão: isso deixa 3 catálogos de equipamento
// coexistindo no projeto. Registrado como pendência de unificação
// futura — não é bloqueio pra essa entrega.
// ────────────────────────────────────────────────────────────

export type TipoDia = 'nublado' | 'tipico' | 'limpo';

/** kWh/kWp por hora (05h–18h), curva normalizada por 1 kWp instalado. */
export const GERACAO_HORARIA: Record<TipoDia, Record<number, number>> = {
  nublado: { 5: 0.001, 6: 0.007, 7: 0.017, 8: 0.045, 9: 0.060, 10: 0.074, 11: 0.083, 12: 0.060, 13: 0.089, 14: 0.073, 15: 0.037, 16: 0.008, 17: 0.003, 18: 0.000 },
  tipico: { 5: 0.008, 6: 0.066, 7: 0.241, 8: 0.365, 9: 0.444, 10: 0.422, 11: 0.365, 12: 0.430, 13: 0.442, 14: 0.289, 15: 0.187, 16: 0.098, 17: 0.042, 18: 0.001 },
  limpo: { 5: 0.016, 6: 0.111, 7: 0.322, 8: 0.557, 9: 0.662, 10: 0.675, 11: 0.674, 12: 0.659, 13: 0.669, 14: 0.629, 15: 0.595, 16: 0.357, 17: 0.123, 18: 0.002 },
};

/** kWh/kWp no dia inteiro — mostrado nos cards de resumo. */
export const GERACAO_DIARIA_TOTAL: Record<TipoDia, number> = {
  nublado: 0.56,
  tipico: 3.40,
  limpo: 6.05,
};

export const NOME_DIA: Record<TipoDia, string> = { nublado: 'Nublado', tipico: 'Típico', limpo: 'Limpo' };

/** Ordem fixa dos 3 dias simulados em sequência (72h contínuas). */
export const ORDEM_DIAS: TipoDia[] = ['nublado', 'tipico', 'limpo'];

/** [inicio, fim) em horas 0-23 — fim exclusivo. Pode cruzar meia-noite (ex: 19-27 = 19h às 03h). */
export type Janela = [number, number][];

interface ItemBase {
  id: string;
  nome: string;
  /** Potência nominal em kW (por unidade). */
  pot: number;
  janela: Janela;
}

export interface ItemFixo extends ItemBase {
  tipo: 'fixo';
  /** Fator de serviço (uso real vs nominal). */
  fator: number;
  /** Horas/dia de uso, já considerando a janela. */
  horas: number;
}

export interface ItemTempoAjustavel extends ItemBase {
  tipo: 'tempo_ajustavel';
  unidade: 'h' | 'min';
  /** Valor padrão sugerido (mesma unidade do campo `unidade`). */
  padrao: number;
}

export type ItemCatalogo = (ItemFixo | ItemTempoAjustavel) & {
  /** Presente só no Veículo Elétrico — km/dia rodados padrão. */
  kmDia?: number;
};

export interface CategoriaCatalogo {
  categoria: string;
  itens: ItemCatalogo[];
}

export const CATALOGO_HIBRIDO: CategoriaCatalogo[] = [
  {
    categoria: 'Ar-condicionado',
    itens: [
      { id: 'ac9', nome: '9.000 BTU Inverter', pot: 0.86, janela: [[19, 27]], tipo: 'tempo_ajustavel', unidade: 'h', padrao: 8 },
      { id: 'ac12', nome: '12.000 BTU Inverter', pot: 1.10, janela: [[19, 27]], tipo: 'tempo_ajustavel', unidade: 'h', padrao: 8 },
      { id: 'ac18', nome: '18.000 BTU Inverter', pot: 1.60, janela: [[19, 27]], tipo: 'tempo_ajustavel', unidade: 'h', padrao: 8 },
      { id: 'ac24', nome: '24.000 BTU Inverter', pot: 2.00, janela: [[19, 27]], tipo: 'tempo_ajustavel', unidade: 'h', padrao: 8 },
      { id: 'ac30', nome: '30.000 BTU Inverter', pot: 2.80, janela: [[19, 27]], tipo: 'tempo_ajustavel', unidade: 'h', padrao: 8 },
      { id: 'ac36', nome: '36.000 BTU Inverter', pot: 3.30, janela: [[19, 27]], tipo: 'tempo_ajustavel', unidade: 'h', padrao: 8 },
      { id: 'ac48', nome: '48.000 BTU Inverter', pot: 4.20, janela: [[19, 27]], tipo: 'tempo_ajustavel', unidade: 'h', padrao: 8 },
      { id: 'ac60', nome: '60.000 BTU Inverter', pot: 5.20, janela: [[19, 27]], tipo: 'tempo_ajustavel', unidade: 'h', padrao: 8 },
    ],
  },
  {
    categoria: 'Cozinha',
    itens: [
      { id: 'airfryer', nome: 'Air Fryer', pot: 1.5, janela: [[18, 19]], tipo: 'fixo', fator: 0.75, horas: 0.5 },
      { id: 'forno', nome: 'Forno de embutir elétrico', pot: 2.5, janela: [[19, 20]], tipo: 'fixo', fator: 0.75, horas: 1 },
      { id: 'fogao', nome: 'Fogão de indução', pot: 3.5, janela: [[18, 20]], tipo: 'fixo', fator: 0.70, horas: 1.5 },
      { id: 'micro', nome: 'Micro-ondas', pot: 1.2, janela: [[12, 13], [19, 20]], tipo: 'tempo_ajustavel', unidade: 'min', padrao: 10 },
    ],
  },
  {
    categoria: 'Refrigeração',
    itens: [
      { id: 'gel_p', nome: 'Geladeira pequena 1 porta', pot: 0.10, janela: [[0, 24]], tipo: 'fixo', fator: 0.70, horas: 24 },
      { id: 'gel_g', nome: 'Geladeira grande 2 portas', pot: 0.17, janela: [[0, 24]], tipo: 'fixo', fator: 0.70, horas: 24 },
      { id: 'frz1', nome: 'Freezer horizontal 1 porta', pot: 0.12, janela: [[0, 24]], tipo: 'fixo', fator: 0.70, horas: 24 },
      { id: 'frz2', nome: 'Freezer horizontal 2 portas', pot: 0.20, janela: [[0, 24]], tipo: 'fixo', fator: 0.70, horas: 24 },
      { id: 'cerv', nome: 'Cervejeira', pot: 0.09, janela: [[0, 24]], tipo: 'fixo', fator: 0.70, horas: 24 },
      { id: 'adega', nome: 'Adega climatizada', pot: 0.11, janela: [[0, 24]], tipo: 'fixo', fator: 0.70, horas: 24 },
    ],
  },
  {
    categoria: 'Lavanderia',
    itens: [
      { id: 'secadora', nome: 'Secadora de roupas', pot: 3.0, janela: [[10, 11]], tipo: 'fixo', fator: 0.85, horas: 1 },
      { id: 'lavaseca', nome: 'Lava e Seca', pot: 2.5, janela: [[10, 11]], tipo: 'fixo', fator: 0.85, horas: 1 },
      { id: 'maquina', nome: 'Máquina de lavar', pot: 0.5, janela: [[9, 11]], tipo: 'fixo', fator: 0.70, horas: 1 },
    ],
  },
  {
    categoria: 'Piscina',
    itens: [
      { id: 'bomba14', nome: 'Bomba piscina 1/4 CV', pot: 0.18, janela: [[11, 12]], tipo: 'fixo', fator: 0.85, horas: 1 },
      { id: 'bomba13', nome: 'Bomba piscina 1/3 CV', pot: 0.25, janela: [[11, 12]], tipo: 'fixo', fator: 0.85, horas: 1 },
      { id: 'bomba12', nome: 'Bomba piscina 1/2 CV', pot: 0.37, janela: [[11, 12]], tipo: 'fixo', fator: 0.85, horas: 1 },
      { id: 'bomba34', nome: 'Bomba piscina 3/4 CV', pot: 0.55, janela: [[11, 12]], tipo: 'fixo', fator: 0.85, horas: 1 },
      { id: 'aq15', nome: 'Aquecedor piscina 15.000L', pot: 6.0, janela: [[10, 14]], tipo: 'fixo', fator: 0.90, horas: 4 },
      { id: 'aq25', nome: 'Aquecedor piscina 25.000L', pot: 9.0, janela: [[10, 14]], tipo: 'fixo', fator: 0.90, horas: 4 },
    ],
  },
  {
    categoria: 'Veículo Elétrico',
    itens: [
      { id: 've', nome: 'Veículo elétrico (0,20 kWh/km)', pot: 2.0, janela: [[22, 30]], tipo: 'fixo', fator: 1.00, horas: 2, kmDia: 20 },
    ],
  },
  {
    categoria: 'Iluminação',
    itens: [
      { id: 'led9', nome: 'Lâmpada LED 9W', pot: 0.009, janela: [[18, 23], [5, 7]], tipo: 'fixo', fator: 0.95, horas: 7 },
      { id: 'led12', nome: 'Lâmpada LED 12W', pot: 0.012, janela: [[18, 23], [5, 7]], tipo: 'fixo', fator: 0.95, horas: 7 },
      { id: 'led20', nome: 'Lâmpada LED 20W', pot: 0.020, janela: [[18, 23], [5, 7]], tipo: 'fixo', fator: 0.95, horas: 7 },
      { id: 'led50', nome: 'Lâmpada LED 50W (área externa)', pot: 0.050, janela: [[18, 30]], tipo: 'fixo', fator: 0.95, horas: 12 },
    ],
  },
  {
    categoria: 'Ventilação',
    itens: [
      { id: 'vteto', nome: 'Ventilador de teto', pot: 0.120, janela: [[13, 22]], tipo: 'fixo', fator: 0.85, horas: 9 },
      { id: 'vpe', nome: 'Ventilador de pé/coluna', pot: 0.070, janela: [[13, 22]], tipo: 'fixo', fator: 0.85, horas: 9 },
    ],
  },
  {
    categoria: 'Conectividade',
    itens: [
      { id: 'modem', nome: 'Modem', pot: 0.010, janela: [[0, 24]], tipo: 'fixo', fator: 1.00, horas: 24 },
      { id: 'roteador', nome: 'Roteador Wi-Fi', pot: 0.010, janela: [[0, 24]], tipo: 'fixo', fator: 1.00, horas: 24 },
      { id: 'starmini', nome: 'Starlink Mini', pot: 0.030, janela: [[0, 24]], tipo: 'fixo', fator: 1.00, horas: 24 },
      { id: 'stardir', nome: 'Starlink direcionável', pot: 0.075, janela: [[0, 24]], tipo: 'fixo', fator: 1.00, horas: 24 },
      { id: 'carregador', nome: 'Carregador de celular', pot: 0.010, janela: [[22, 30]], tipo: 'fixo', fator: 0.50, horas: 8 },
    ],
  },
  {
    categoria: 'Entretenimento',
    itens: [
      { id: 'tv', nome: 'TV LED', pot: 0.150, janela: [[19, 23]], tipo: 'fixo', fator: 0.90, horas: 4 },
    ],
  },
  {
    categoria: 'Chuveiro',
    itens: [
      { id: 'chuveiro', nome: 'Chuveiro elétrico', pot: 5.5, janela: [[6, 8], [18, 21]], tipo: 'tempo_ajustavel', unidade: 'min', padrao: 16 },
    ],
  },
  {
    categoria: 'Bombeamento',
    itens: [
      { id: 'bombaagua', nome: "Bomba de água (caixa d'água)", pot: 0.500, janela: [[6, 7], [18, 19]], tipo: 'fixo', fator: 0.90, horas: 2 },
    ],
  },
];

/** Itens marcados por padrão ao abrir a ferramenta (mesmo default do protótipo validado). */
export const SELECIONADOS_PADRAO = ['gel_g', 'led9', 'led12', 'modem', 'roteador', 'tv', 'chuveiro'];

/** Capacidades de bateria disponíveis — tabela provisória (trocar pelos SKUs reais depois). */
export const CAPACIDADES_BATERIA_KWH = [5, 10, 15, 20];
