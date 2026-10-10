// Rótulos amigáveis usados para montar a mensagem de WhatsApp — nunca
// mandamos códigos internos (ex.: "600_1000") nem JSON bruto para o cliente.
export const CONSUMPTION_LABELS: Record<string, string> = {
  '250_600': 'conta entre R$ 250 e R$ 600',
  '600_1000': 'conta entre R$ 600 e R$ 1.000',
  '1000_3000': 'conta entre R$ 1.000 e R$ 3.000',
  acima_3000: 'consumo acima disso (Grupo A / alto consumo)',
  '250_1500': 'conta entre R$ 250 e R$ 1.500 (Grupo A/demanda ou B optante)',
  '1500_16000': 'conta entre R$ 1.500 e R$ 16.000 (Grupo A/demanda ou B optante)',
  acima_16000: 'conta acima de R$ 16.000 (Grupo A/demanda ou B optante)',
};

export const PRIORITY_LABELS: Record<string, string> = {
  responsabilidade: 'empresa local, responsável pela instalação e pós-venda',
  preco: 'menor orçamento possível',
};

export const EXCITEMENT_LABELS: Record<number, string> = {
  1: 'só dando uma olhada',
  3: 'tenho curiosidade',
  6: 'já estou considerando de verdade',
  9: 'quero colocar solar',
  10: 'se os números fizerem sentido, quero resolver isso',
};
