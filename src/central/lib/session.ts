// Sessão da Central: estado em memória + persistência em sessionStorage
// (seção 37 da spec) para sobreviver a navegação entre vídeo/upload sem
// perder respostas, sem guardar dados pessoais indefinidamente (a sessão
// some ao fechar a aba, por ser sessionStorage).
import { CentralSession, UtmData } from '../types';

const STORAGE_KEY = 'tls_central_session';

function readUtmFromUrl(): UtmData {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  const utm: UtmData = {};
  const source = params.get('utm_source');
  const medium = params.get('utm_medium');
  const campaign = params.get('utm_campaign');
  const term = params.get('utm_term');
  const content = params.get('utm_content');
  const src = params.get('src');
  if (source) utm.source = source;
  if (medium) utm.medium = medium;
  if (campaign) utm.campaign = campaign;
  if (term) utm.term = term;
  if (content) utm.content = content;
  if (src) utm.src = src;
  return utm;
}

function newSessionId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `s_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }
}

export function createEmptySession(): CentralSession {
  return {
    sessionId: newSessionId(),
    startedAt: new Date().toISOString(),
    utm: readUtmFromUrl(),
    entryPath: null,
    customerStatus: null,
    intent: null,
    talkNow: false,
    answers: {},
    chips: {},
    videosViewed: [],
    filesAttached: [],
    lead: {},
    score: 0,
    destination: null,
    completed: false,
    history: [],
    currentStep: 'home',
  };
}

export function loadSession(): CentralSession {
  if (typeof window === 'undefined') return createEmptySession();
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptySession();
    const parsed = JSON.parse(raw) as CentralSession;
    // UTMs da URL atual sempre vencem (por exemplo se o link mudou entre cliques).
    const utmAtual = readUtmFromUrl();
    return { ...createEmptySession(), ...parsed, utm: { ...parsed.utm, ...utmAtual } };
  } catch {
    return createEmptySession();
  }
}

export function saveSession(session: CentralSession): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Best-effort — nunca quebra a experiência por falha de storage.
  }
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}
