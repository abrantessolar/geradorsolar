import React from 'react';
import { Phone } from 'lucide-react';

export function formatWhatsAppUrl(phone: string): string {
  const clean = phone.replace(/[\s\-\(\)]/g, '');
  const num = clean.startsWith('+55') ? clean.substring(1) : clean.startsWith('55') ? clean : `55${clean}`;
  return `https://wa.me/${num}`;
}

export default function WhatsAppLink({ phone, className }: { phone?: string | null; className?: string }) {
  if (!phone) return <span className="text-muted-foreground">—</span>;
  return (
    <a
      href={formatWhatsAppUrl(phone)}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 text-green-600 hover:text-green-500 hover:underline ${className || ''}`}
    >
      <Phone className="w-3 h-3" />
      {phone}
    </a>
  );
}
