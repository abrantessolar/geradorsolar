import { describe, it, expect, beforeEach } from 'vitest';
import { resolveDestination } from '@/central/lib/routing';
import { buildWhatsAppMessage, formatWhatsAppUrl } from '@/central/lib/whatsapp';
import { createEmptySession, loadSession, saveSession } from '@/central/lib/session';
import { calculateScore } from '@/central/config/scoring';
import { CentralSession } from '@/central/types';

function sessaoBase(patch: Partial<CentralSession> = {}): CentralSession {
  return { ...createEmptySession(), ...patch };
}

describe('resolveDestination — motor de roteamento (seção 31 da spec)', () => {
  it('"Falar com alguém agora" sempre vence, independente de outras respostas', () => {
    const s = sessaoBase({ talkNow: true, intent: 'quote', customerStatus: 'customer' });
    expect(resolveDestination(s)).toBe('general');
  });

  it('intenção de orçamento/novo projeto vai para comercial mesmo sem customerStatus', () => {
    expect(resolveDestination(sessaoBase({ intent: 'quote' }))).toBe('commercial');
  });

  it('cliente que quer ampliar/bateria/novo projeto vai para comercial, não para pós-venda', () => {
    expect(resolveDestination(sessaoBase({ customerStatus: 'customer', intent: 'upgrade' }))).toBe('commercial');
  });

  it('cliente com necessidade de serviço comum vai para pós-venda', () => {
    expect(resolveDestination(sessaoBase({ customerStatus: 'customer', intent: 'service' }))).toBe('customerSupport');
  });

  it('sistema de outra empresa com necessidade de ampliação vai para comercial', () => {
    expect(resolveDestination(sessaoBase({ customerStatus: 'external_system', intent: 'upgrade' }))).toBe('commercial');
  });

  it('sistema de outra empresa com necessidade de suporte vai para suporte externo', () => {
    expect(resolveDestination(sessaoBase({ customerStatus: 'external_system', intent: 'service' }))).toBe('externalSupport');
  });

  it('fornecedor vai para o destino de fornecedor', () => {
    expect(resolveDestination(sessaoBase({ customerStatus: 'supplier' }))).toBe('supplier');
  });

  it('sem nenhuma informação, cai no destino geral', () => {
    expect(resolveDestination(sessaoBase())).toBe('general');
  });
});

describe('buildWhatsAppMessage — nunca envia campos vazios, nome de atendente ou score', () => {
  it('mensagem comercial inclui só os campos preenchidos', () => {
    const s = sessaoBase({
      intent: 'quote',
      consumptionRange: '600_1000',
      priority: 'responsabilidade',
      excitement: 9,
      answers: { B: 'Reduzir minha conta de energia' },
      score: 999,
    });
    const msg = buildWhatsAppMessage(s);
    expect(msg).toContain('Reduzir minha conta de energia');
    expect(msg).toContain('R$ 600 e R$ 1.000');
    expect(msg).toContain('empresa local');
    expect(msg).toContain('9/10');
    expect(msg).not.toContain('999');
    expect(msg.toLowerCase()).not.toContain('atendente');
  });

  it('mensagem comercial sem nenhuma resposta ainda assim não quebra e não deixa placeholders vazios', () => {
    const msg = buildWhatsAppMessage(sessaoBase({ intent: 'quote' }));
    expect(msg).not.toMatch(/\{\{.*\}\}/);
    expect(msg).not.toContain('undefined');
    expect(msg).not.toContain('null');
  });

  it('mensagem de "falar com alguém agora" inclui o resumo do que já foi respondido', () => {
    const s = sessaoBase({ talkNow: true, answers: { A1: 'Inversor desligado' } });
    const msg = buildWhatsAppMessage(s);
    expect(msg).toContain('preferi falar com alguém');
    expect(msg).toContain('Inversor desligado');
  });

  it('mensagem de suporte externo usa os campos certos (marca, status do inversor)', () => {
    const s = sessaoBase({
      customerStatus: 'external_system', intent: 'service',
      answers: { C1: 'Sim', C1_marca: 'Growatt' },
    });
    const msg = buildWhatsAppMessage(s);
    expect(msg).toContain('Growatt');
    expect(msg).toContain('instalado por outra empresa');
  });

  it('mensagem de fornecedor inclui dados da empresa quando presentes', () => {
    const s = sessaoBase({
      customerStatus: 'supplier',
      answers: { D: 'Equipamentos para energia solar' },
      lead: { empresa: 'Fornecedora XYZ', nome: 'Maria' },
    });
    const msg = buildWhatsAppMessage(s);
    expect(msg).toContain('Fornecedora XYZ');
  });
});

describe('formatWhatsAppUrl', () => {
  it('monta a URL wa.me com o texto codificado', () => {
    const url = formatWhatsAppUrl('5567996448995', 'Olá! Teste');
    expect(url).toBe('https://wa.me/5567996448995?text=Ol%C3%A1!%20Teste');
  });
});

describe('calculateScore — nunca deve ser exposto ao usuário, só usado internamente', () => {
  it('soma pontos por sinais positivos sem lançar erro em sessão vazia', () => {
    expect(calculateScore(createEmptySession())).toBe(0);
  });

  it('empolgação alta + fatura enviada + WhatsApp preenchido pontua mais que sessão mínima', () => {
    const alta = calculateScore(sessaoBase({
      excitement: 10, filesAttached: ['fatura.pdf'], lead: { whatsapp: '67999999999' }, consumptionRange: '1000_3000',
    }));
    const baixa = calculateScore(sessaoBase({ excitement: 1 }));
    expect(alta).toBeGreaterThan(baixa);
  });
});

describe('sessão — persistência e UTMs (seção 32/37 da spec)', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.history.pushState({}, '', '/central');
  });

  it('cria sessão vazia com histórico e step inicial corretos', () => {
    const s = createEmptySession();
    expect(s.currentStep).toBe('home');
    expect(s.history).toEqual([]);
    expect(s.completed).toBe(false);
  });

  it('captura UTMs da URL ao carregar a sessão', () => {
    window.history.pushState({}, '', '/central?utm_source=google&utm_medium=cpc&utm_campaign=solar_residencial');
    const s = loadSession();
    expect(s.utm.source).toBe('google');
    expect(s.utm.medium).toBe('cpc');
    expect(s.utm.campaign).toBe('solar_residencial');
  });

  it('persiste e recarrega a sessão via sessionStorage', () => {
    const s = sessaoBase({ currentStep: 'B', history: ['home'] });
    saveSession(s);
    const reloaded = loadSession();
    expect(reloaded.currentStep).toBe('B');
    expect(reloaded.history).toEqual(['home']);
  });
});
