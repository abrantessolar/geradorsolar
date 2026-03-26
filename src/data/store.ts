import { AdminSettings, Kit, Proposal, SocialProof, PriceTableEntry, CA_MATERIAL_TABLE_DEFAULT, DEFAULT_CARD_RATES } from './types';

const STORAGE_KEYS = {
  kits: 'tls_kits',
  settings: 'tls_settings',
  proposals: 'tls_proposals',
  socialProofs: 'tls_social_proofs',
  adminAuth: 'tls_admin_auth',
  priceTable: 'tls_price_table',
};

const DEFAULT_SETTINGS: AdminSettings = {
  profitMargin: 30,
  defaultCET: 2.214,
  defaultKwhPrice: { 'MS': 0.85, 'SP': 0.90, 'MG': 0.88 },
  irradiationEntries: [
    { id: '1', state: 'MS', city: 'Três Lagoas', value: 5.0 },
    { id: '2', state: 'MS', city: 'Campo Grande', value: 4.8 },
    { id: '3', state: 'SP', city: 'São Paulo', value: 4.2 },
  ],
  proposalValidity: 15,
  installationDays: 30,
  homologationDays: 10,
  systemLoss: 21,
  installationPricePerPanel: 100,
  homologationPrice: 70,
  trunkCablePrice: 300,
  caMaterialTable: CA_MATERIAL_TABLE_DEFAULT,
  creditCardRates: DEFAULT_CARD_RATES,
  company: {
    name: 'Três Lagoas Solar - Energia Limpa',
    cnpj: '00.000.000/0001-00',
    phone: '(67) 99999-9999',
    email: 'contato@treslagoassolar.com.br',
    site: 'www.treslagoassolar.com.br',
    social: '@treslagoassolar',
  },
  sellers: [
    { id: '1', name: 'Carlos Silva', phone: '(67) 99999-0001', active: true },
    { id: '2', name: 'Ana Souza', phone: '(67) 99999-0002', active: true },
    { id: '3', name: 'Pedro Santos', phone: '(67) 99999-0003', active: true },
  ],
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
  // Premium (micro inversores)
  { id: 'inv-pr-micro', line: 'premium', type: 'inversor', brand: 'Enphase', model: 'IQ8M', power: 2.0, warranty: 25, costPrice: 1800, minPower: 0, maxPower: 999, active: true },
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

export function getSettings(): AdminSettings {
  const s = load(STORAGE_KEYS.settings, DEFAULT_SETTINGS);
  if (!s.irradiationEntries) s.irradiationEntries = DEFAULT_SETTINGS.irradiationEntries;
  if (!s.caMaterialTable) s.caMaterialTable = DEFAULT_SETTINGS.caMaterialTable;
  if (!s.creditCardRates) s.creditCardRates = DEFAULT_CARD_RATES;
  if (s.installationPricePerPanel === undefined) s.installationPricePerPanel = 100;
  if (s.homologationPrice === undefined) s.homologationPrice = 70;
  if (s.trunkCablePrice === undefined) s.trunkCablePrice = 300;
  if (s.homologationDays === undefined) s.homologationDays = 10;
  if (s.sellers && s.sellers.length > 0 && typeof s.sellers[0] === 'string') {
    s.sellers = (s.sellers as unknown as string[]).map((name, i) => ({
      id: String(i + 1), name, phone: '', active: true,
    }));
  }
  return s;
}
export function saveSettings(s: AdminSettings) { save(STORAGE_KEYS.settings, s); }

export function getProposals(): Proposal[] { return load(STORAGE_KEYS.proposals, []); }
export function saveProposals(p: Proposal[]) { save(STORAGE_KEYS.proposals, p); }
export function saveProposal(p: Proposal) {
  const all = getProposals();
  const idx = all.findIndex(x => x.id === p.id);
  if (idx >= 0) all[idx] = p; else all.push(p);
  saveProposals(all);
}

export function getPriceTable(): PriceTableEntry[] { return load(STORAGE_KEYS.priceTable, []); }
export function savePriceTable(t: PriceTableEntry[]) { save(STORAGE_KEYS.priceTable, t); }

export function getSocialProofs(): SocialProof[] { return load(STORAGE_KEYS.socialProofs, []); }
export function saveSocialProofs(s: SocialProof[]) { save(STORAGE_KEYS.socialProofs, s); }

export function isAdminLoggedIn(): boolean { return load(STORAGE_KEYS.adminAuth, false); }
export function setAdminAuth(v: boolean) { save(STORAGE_KEYS.adminAuth, v); }

export function lookupIrradiation(state: string, city: string): { value: number; found: boolean } {
  const settings = getSettings();
  const entry = settings.irradiationEntries.find(
    e => e.state === state && e.city.toLowerCase() === city.toLowerCase()
  );
  return entry ? { value: entry.value, found: true } : { value: 5.0, found: false };
}
