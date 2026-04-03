import { MapPin, Phone, Mail, Clock, ExternalLink } from 'lucide-react';

const MAPS_EMBED_URL = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3762.5!2d-51.684020545129925!3d-20.795708921126337!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjDCsDQ3JzQ0LjYiUyA1McKwNDEnMDIuNSJX!5e0!3m2!1spt-BR!2sbr!4v1';
const MAPS_LINK = 'https://maps.google.com/?q=-20.795708921126337,-51.684020545129925';
const WHATSAPP_URL = 'https://wa.me/5567996448995?text=Olá! Gostaria de agendar uma visita.';
const HERO_BG = 'https://static.wixstatic.com/media/c2ae0d_0fc9044d218948a585d2170345d4ce87~mv2.jpg';

const contactItems = [
  { icon: MapPin, label: 'Rua Luiz Corrêa da Silveira, nº 934, Jardim Alvorada, Três Lagoas/MS' },
  { icon: Phone, label: '(67) 9 9644-8995', href: 'tel:+5567996448995' },
  { icon: Mail, label: 'contato@treslagoassolar.com.br', href: 'mailto:contato@treslagoassolar.com.br' },
  { icon: Clock, label: 'Segunda a Sexta, 8h às 18h' },
  { icon: Clock, label: 'Sábado: Sob agendamento' },
];

export default function OndeEstamos() {
  return (
    <section className="relative py-16 sm:py-20">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${HERO_BG})` }}
      />
      <div className="absolute inset-0 bg-black/70" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
        <h2 className="text-3xl sm:text-4xl font-bold text-white text-center mb-10">
          Onde Estamos
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Left - Contact info */}
          <div className="space-y-5">
            {contactItems.map((item, i) => {
              const Icon = item.icon;
              const content = (
                <div key={i} className="flex items-start gap-3">
                  <Icon className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                  <span className={`text-white/90 text-sm sm:text-base ${item.href ? 'hover:text-secondary transition-colors' : ''}`}>
                    {item.label}
                  </span>
                </div>
              );
              return item.href ? (
                <a key={i} href={item.href} className="block">{content}</a>
              ) : (
                <div key={i}>{content}</div>
              );
            })}

            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-4 px-6 py-3 rounded-lg font-semibold text-white transition-all hover:opacity-90 active:scale-95"
              style={{ backgroundColor: 'hsl(var(--primary))' }}
            >
              <Phone className="w-5 h-5" />
              Agendar Visita
            </a>
          </div>

          {/* Right - Map */}
          <div className="space-y-3">
            <div className="rounded-xl overflow-hidden shadow-lg border border-white/10">
              <iframe
                src={MAPS_EMBED_URL}
                width="100%"
                height="300"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Localização Três Lagoas Solar"
              />
            </div>
            <a
              href={MAPS_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-secondary transition-colors"
            >
              <ExternalLink className="w-4 h-4" /> Ver no Google Maps
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
