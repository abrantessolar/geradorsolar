import { MapPin, Phone, Mail, Globe } from 'lucide-react';

export default function ProposalFooter() {
  return (
    <div className="border-t border-border mt-8 pt-6 pb-4">
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-primary" />
          Rua Luiz Corrêa da Silveira, nº 934, Jardim Alvorada, Três Lagoas/MS
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Phone className="w-3.5 h-3.5 text-primary" />
          (67) 9 9644-8995
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Mail className="w-3.5 h-3.5 text-primary" />
          contato@treslagoassolar.com.br
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-primary" />
          www.treslagoassolar.com.br
        </span>
      </div>
    </div>
  );
}
