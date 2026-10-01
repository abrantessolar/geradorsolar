export interface PropostaPlaca {
  id: string;
  numeroProposta: string | null;
  codigoAcesso: string;

  clienteNome: string;
  clienteCidade: string | null;
  clienteUf: string | null;
  clienteTelefone: string | null;

  responsavelNome: string | null;
  responsavelTelefone: string | null;

  placaId: string | null;
  placaMarca: string | null;
  placaModelo: string | null;
  placaPotenciaWp: number | null;
  placaImagem: string | null;
  qtdPlacas: number;
  potenciaKwp: number | null;

  /** 12 valores em kWh, na ordem jan..dez. */
  geracaoMensalKwh: number[] | null;
  geracaoMediaKwh: number | null;

  precoAvista: number;
  /** Congelado no momento da geração (mesmas taxas de settings.creditCardRates na hora). */
  cartaoParcelas: { meses: number; valor: number }[] | null;

  observacoes: string | null;

  status: string;
  visualizadoEm: string | null;
  criadoEm: string;
}
