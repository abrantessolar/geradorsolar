export interface PropostaHibrida {
  id: string;
  numeroProposta: string | null;
  codigoAcesso: string;

  clienteNome: string;
  clienteCidade: string | null;
  clienteTelefone: string | null;

  responsavelNome: string | null;
  responsavelTelefone: string | null;
  responsavelEmail: string | null;

  placaId: string | null;
  placaMarca: string | null;
  placaModelo: string | null;
  placaPotenciaWp: number | null;
  qtdPlacas: number | null;
  potenciaKwp: number | null;

  inversorHibridoId: string | null;
  inversorHibridoMarca: string | null;
  inversorHibridoModelo: string | null;
  inversorHibridoImagem: string | null;
  inversorHibridoGarantiaAnos: number | null;

  bateriaId: string | null;
  bateriaMarca: string | null;
  bateriaModelo: string | null;
  bateriaCapacidadeKwh: number | null;
  bateriaQtd: number;
  bateriaImagem: string | null;
  bateriaGarantiaAnos: number | null;

  consumoDiarioKwh: number | null;
  geracaoNubladoKwhDia: number | null;
  geracaoTipicoKwhDia: number | null;
  geracaoLimpoKwhDia: number | null;
  autonomiaHoras: number | null;

  precoTotal: number | null;
  observacoes: string | null;

  status: string;
  visualizadoEm: string | null;
  criadoEm: string;
}
