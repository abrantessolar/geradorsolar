import { AdminSettings, Kit, Proposal, SocialProof } from './types';

const STORAGE_KEYS = {
  kits: 'tls_kits',
  settings: 'tls_settings',
  proposals: 'tls_proposals',
  socialProofs: 'tls_social_proofs',
  adminAuth: 'tls_admin_auth',
};

const DEFAULT_SETTINGS: AdminSettings = {
  profitMargin: 30,
  defaultCET: 1.5,
  defaultKwhPrice: { 'MS': 0.85, 'SP': 0.90, 'MG': 0.88 },
  irradiation: { 'Três Lagoas': 5.0, 'Campo Grande': 4.8, 'São Paulo': 4.2 },
  proposalValidity: 15,
  installationDays: 30,
  systemLoss: 21,
  company: {
    name: 'Três Lagoas Solar - Energia Limpa',
    cnpj: '00.000.000/0001-00',
    phone: '(67) 99999-9999',
    email: 'contato@treslagoassolar.com.br',
    site: 'www.treslagoassolar.com.br',
    social: '@treslagoassolar',
  },
  sellers: ['Carlos Silva', 'Ana Souza', 'Pedro Santos'],
};

const DEFAULT_KITS: Kit[] = [
  // Acesso
  { id: 'inv-ac-3', line: 'acesso', type: 'inversor', brand: 'Growatt', model: 'MIN 3000TL-X', power: 3, warranty: 10, costPrice: 2200, minPower: 1, maxPower: 3.5, active: true },
  { id: 'inv-ac-5', line: 'acesso', type: 'inversor', brand: 'Growatt', model: 'MIN 5000TL-X', power: 5, warranty: 10, costPrice: 2800, minPower: 3.5, maxPower: 6, active: true },
  { id: 'inv-ac-8', line: 'acesso', type: 'inversor', brand: 'Growatt', model: 'MIN 8000TL-X', power: 8, warranty: 10, costPrice: 3500, minPower: 6, maxPower: 10, active: true },
  { id: 'inv-ac-10', line: 'acesso', type: 'inversor', brand: 'Growatt', model: 'MOD 10KTL3-X', power: 10, warranty: 10, costPrice: 4200, minPower: 8, maxPower: 15, active: true },
  { id: 'inv-ac-15', line: 'acesso', type: 'inversor', brand: 'Growatt', model: 'MOD 15KTL3-X', power: 15, warranty: 10, costPrice: 5800, minPower: 12, maxPower: 20, active: true },
  { id: 'inv-ac-25', line: 'acesso', type: 'inversor', brand: 'Growatt', model: 'MOD 25KTL3-X', power: 25, warranty: 10, costPrice: 7500, minPower: 18, maxPower: 30, active: true },
  { id: 'pan-ac', line: 'acesso', type: 'placa', brand: 'DAH Solar', model: 'DHM-60X10/FS', power: 570, warranty: 25, costPrice: 480, minPower: 0, maxPower: 999, active: true },
  // Excellence
  { id: 'inv-ex-3', line: 'excellence', type: 'inversor', brand: 'Huawei', model: 'SUN2000-3KTL-L1', power: 3, warranty: 10, costPrice: 3200, minPower: 1, maxPower: 3.5, active: true },
  { id: 'inv-ex-5', line: 'excellence', type: 'inversor', brand: 'Huawei', model: 'SUN2000-5KTL-L1', power: 5, warranty: 10, costPrice: 3800, minPower: 3.5, maxPower: 6, active: true },
  { id: 'inv-ex-8', line: 'excellence', type: 'inversor', brand: 'Huawei', model: 'SUN2000-8KTL-M1', power: 8, warranty: 10, costPrice: 4800, minPower: 6, maxPower: 10, active: true },
  { id: 'inv-ex-10', line: 'excellence', type: 'inversor', brand: 'Huawei', model: 'SUN2000-10KTL-M1', power: 10, warranty: 10, costPrice: 5500, minPower: 8, maxPower: 15, active: true },
  { id: 'inv-ex-15', line: 'excellence', type: 'inversor', brand: 'Huawei', model: 'SUN2000-15KTL-M2', power: 15, warranty: 10, costPrice: 7200, minPower: 12, maxPower: 20, active: true },
  { id: 'inv-ex-25', line: 'excellence', type: 'inversor', brand: 'Huawei', model: 'SUN2000-25KTL-M5', power: 25, warranty: 10, costPrice: 9800, minPower: 18, maxPower: 30, active: true },
  { id: 'pan-ex', line: 'excellence', type: 'placa', brand: 'Trina Solar', model: 'TSM-570DE21', power: 570, warranty: 25, costPrice: 580, minPower: 0, maxPower: 999, active: true },
  // Premium
  { id: 'inv-pr-3', line: 'premium', type: 'inversor', brand: 'SolarEdge', model: 'SE3000H', power: 3, warranty: 12, costPrice: 4500, minPower: 1, maxPower: 3.5, active: true },
  { id: 'inv-pr-5', line: 'premium', type: 'inversor', brand: 'SolarEdge', model: 'SE5000H', power: 5, warranty: 12, costPrice: 5200, minPower: 3.5, maxPower: 6, active: true },
  { id: 'inv-pr-8', line: 'premium', type: 'inversor', brand: 'SolarEdge', model: 'SE8K', power: 8, warranty: 12, costPrice: 6500, minPower: 6, maxPower: 10, active: true },
  { id: 'inv-pr-10', line: 'premium', type: 'inversor', brand: 'SolarEdge', model: 'SE10K', power: 10, warranty: 12, costPrice: 7800, minPower: 8, maxPower: 15, active: true },
  { id: 'inv-pr-15', line: 'premium', type: 'inversor', brand: 'SolarEdge', model: 'SE15K', power: 15, warranty: 12, costPrice: 9500, minPower: 12, maxPower: 20, active: true },
  { id: 'inv-pr-25', line: 'premium', type: 'inversor', brand: 'SolarEdge', model: 'SE25K', power: 25, warranty: 12, costPrice: 12500, minPower: 18, maxPower: 30, active: true },
  { id: 'pan-pr', line: 'premium', type: 'placa', brand: 'Canadian Solar', model: 'CS7L-570MB-AG', power: 570, warranty: 30, costPrice: 720, minPower: 0, maxPower: 999, active: true },
];

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function save<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data));
}

export function getKits(): Kit[] { return load(STORAGE_KEYS.kits, DEFAULT_KITS); }
export function saveKits(kits: Kit[]) { save(STORAGE_KEYS.kits, kits); }

export function getSettings(): AdminSettings { return load(STORAGE_KEYS.settings, DEFAULT_SETTINGS); }
export function saveSettings(s: AdminSettings) { save(STORAGE_KEYS.settings, s); }

export function getProposals(): Proposal[] { return load(STORAGE_KEYS.proposals, []); }
export function saveProposals(p: Proposal[]) { save(STORAGE_KEYS.proposals, p); }
export function saveProposal(p: Proposal) {
  const all = getProposals();
  const idx = all.findIndex(x => x.id === p.id);
  if (idx >= 0) all[idx] = p; else all.push(p);
  saveProposals(all);
}

export function getSocialProofs(): SocialProof[] { return load(STORAGE_KEYS.socialProofs, []); }
export function saveSocialProofs(s: SocialProof[]) { save(STORAGE_KEYS.socialProofs, s); }

export function isAdminLoggedIn(): boolean { return load(STORAGE_KEYS.adminAuth, false); }
export function setAdminAuth(v: boolean) { save(STORAGE_KEYS.adminAuth, v); }
