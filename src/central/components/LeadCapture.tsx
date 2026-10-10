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
    <div className="ca-actions">
      {fields.map((field) => (
        <div key={field} className="ca-field">
          <label>{FIELD_LABELS[field]}</label>
          <input
            type={field === 'whatsapp' ? 'tel' : 'text'}
            value={lead[field] || ''}
            onChange={(e) => setLead((l) => ({ ...l, [field]: e.target.value }))}
            placeholder={field === 'whatsapp' ? '(67) 99999-9999' : ''}
          />
        </div>
      ))}
      <button disabled={!valido} onClick={() => { track('lead_completed'); onSubmit(lead); }} className="ca-btn ca-btn-primary">
        {buttonLabel}
      </button>
      <p className="ca-fine" style={{ textAlign: 'center' }}>
        Seus dados serão utilizados apenas para atendimento e análise da sua solicitação pela Três Lagoas Solar.
      </p>
    </div>
  );
}
