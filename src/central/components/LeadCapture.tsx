import { useState } from 'react';
import { LeadData } from '../types';
import { track } from '../lib/analytics';

const FIELD_LABELS: Record<string, string> = {
  nome: 'Nome',
  whatsapp: 'WhatsApp',
  empresa: 'Empresa',
  site: 'Site ou Instagram (opcional)',
  catalogo: 'Catálogo/apresentação — link (opcional)',
};

export default function LeadCapture({
  fields, buttonLabel, onSubmit,
}: { fields: Array<keyof LeadData>; buttonLabel: string; onSubmit: (lead: LeadData) => void }) {
  const [lead, setLead] = useState<LeadData>({});

  const obrigatorios = fields.filter((f) => f === 'nome' || f === 'whatsapp' || f === 'empresa');
  const valido = obrigatorios.every((f) => (lead[f] || '').trim().length > 0);

  return (
    <div className="space-y-3">
      {fields.map((field) => (
        <div key={field}>
          <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: '#6B7585' }}>
            {FIELD_LABELS[field]}
          </label>
          <input
            type={field === 'whatsapp' ? 'tel' : 'text'}
            value={lead[field] || ''}
            onChange={(e) => setLead((l) => ({ ...l, [field]: e.target.value }))}
            placeholder={field === 'whatsapp' ? '(67) 99999-9999' : ''}
            className="w-full h-12 rounded-xl px-4 border outline-none focus:ring-2 transition-shadow"
            style={{ borderColor: '#E3E8EF', color: '#1A2233' }}
          />
        </div>
      ))}
      <button
        disabled={!valido}
        onClick={() => { track('lead_completed'); onSubmit(lead); }}
        className="w-full h-12 rounded-xl font-bold mt-2 transition-opacity disabled:opacity-40"
        style={{ background: '#F5A623', color: '#1A2233' }}
      >
        {buttonLabel}
      </button>
      <p className="text-[11px] text-center" style={{ color: '#8891A0' }}>
        Seus dados serão utilizados apenas para atendimento e análise da sua solicitação pela Três Lagoas Solar.
      </p>
    </div>
  );
}
