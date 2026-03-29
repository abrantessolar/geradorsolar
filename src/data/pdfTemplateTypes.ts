export interface PdfTemplateSettings {
  // CAPA
  cover: {
    showCity: boolean;
    showProposalNumber: boolean;
    logoPosition: 'left' | 'center' | 'right';
    headerText: string; // texto acima do nome do cliente
  };
  // PORTFÓLIO (página 2)
  portfolio: {
    useDbPhotos: boolean; // usar fotos do banco ou imagem fixa
    photoCount: 6 | 9 | 12;
    layout: '2x3' | '3x3' | '3x4';
  };
  // ESPECIFICAÇÕES (página 3)
  specs: {
    showMaterial: boolean;
    showShadowAnalysis: boolean;
    showHomologation: boolean;
    showMonitoring: boolean;
    showWarranty: boolean;
    installments: {
      show72x: boolean;
      show60x: boolean;
      show48x: boolean;
      show36x: boolean;
      show24x: boolean;
    };
  };
  // RETORNO FINANCEIRO (página 4)
  financial: {
    showPayback: boolean;
    showMonthlyLoss: boolean;
    showReturn5: boolean;
    showReturn10: boolean;
    showReturn15: boolean;
    showReturn25: boolean;
    showWithout5: boolean;
    showWithout10: boolean;
    footerText: string;
  };
  // RODAPÉ (todas as páginas)
  footer: {
    showPhone: boolean;
    showEmail: boolean;
    showCnpj: boolean;
    showSite: boolean;
    showSocial: boolean;
    customPhone: string;
    customEmail: string;
    customCnpj: string;
    customSite: string;
    customSocial: string;
  };
}

export const DEFAULT_PDF_TEMPLATE: PdfTemplateSettings = {
  cover: {
    showCity: true,
    showProposalNumber: true,
    logoPosition: 'center',
    headerText: '',
  },
  portfolio: {
    useDbPhotos: false,
    photoCount: 9,
    layout: '3x3',
  },
  specs: {
    showMaterial: true,
    showShadowAnalysis: true,
    showHomologation: true,
    showMonitoring: true,
    showWarranty: true,
    installments: {
      show72x: true,
      show60x: true,
      show48x: true,
      show36x: true,
      show24x: true,
    },
  },
  financial: {
    showPayback: true,
    showMonthlyLoss: false,
    showReturn5: true,
    showReturn10: true,
    showReturn15: true,
    showReturn25: true,
    showWithout5: true,
    showWithout10: true,
    footerText: '',
  },
  footer: {
    showPhone: true,
    showEmail: true,
    showCnpj: true,
    showSite: true,
    showSocial: true,
    customPhone: '',
    customEmail: '',
    customCnpj: '',
    customSite: '',
    customSocial: '',
  },
};
