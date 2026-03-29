import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Shield, FileText, Building2, CreditCard, Zap, BadgeCheck, Plane, Eye, X } from 'lucide-react';

const DIFERENCIAIS = [
  {
    icon: Calendar,
    title: 'Acompanhamento por 3 anos',
    text: 'Monitoramos sua usina no pós-venda para mais segurança e tranquilidade.',
    modal: null,
  },
  {
    icon: Shield,
    title: '3 anos de garantia da instalação',
    text: 'Garantia do nosso serviço, com montagem segura e acabamento profissional.',
    modal: null,
  },
  {
    icon: FileText,
    title: 'Geração garantida em contrato',
    text: 'Dimensionamento técnico com compromisso formal de geração.',
    modal: { type: 'text' as const, label: 'Contrato de geração garantida' },
  },
  {
    icon: Building2,
    title: 'Empresa sólida',
    text: 'Atendimento responsável, estrutura profissional e relação de longo prazo.',
    modal: { type: 'image' as const, url: 'https://static.wixstatic.com/media/c2ae0d_a39bd5c40b7548248101a986677e534a~mv2.jpg', alt: 'Sede da Três Lagoas Solar' },
  },
  {
    icon: CreditCard,
    title: 'Financiamento facilitado',
    text: 'Você financia com a nossa ajuda, sem precisar ir ao banco.',
    modal: null,
  },
  {
    icon: Zap,
    title: 'Sistema solar completo',
    text: 'Entregamos todos os equipamentos e componentes da solução.',
    modal: { type: 'image' as const, url: 'https://static.wixstatic.com/media/c2ae0d_894355b5cb6445ba9c1277ddecfb6ec6~mv2.png', alt: 'Equipamentos de energia solar' },
  },
  {
    icon: BadgeCheck,
    title: 'Materiais selecionados',
    text: 'Usamos estrutura, proteções e acessórios de instalação com padrão de qualidade.',
    modal: null,
  },
  {
    icon: Plane,
    title: 'Análise 3D com drone',
    text: 'Estudo técnico de sombreamento para máxima eficiência do projeto.',
    modal: { type: 'image' as const, url: 'https://static.wixstatic.com/media/c2ae0d_3e01f00f92804e79ac321e54ad8f4d75~mv2.jpg', alt: 'Análise aérea com drone' },
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

interface DiferenciaisProps {
  /** If true, render a simpler version for the proposal page (no motion, compact) */
  compact?: boolean;
}

export default function Diferenciais({ compact = false }: DiferenciaisProps) {
  const [modalImg, setModalImg] = useState<{ url: string; alt: string } | null>(null);

  const Wrapper = compact ? 'div' : motion.div;

  return (
    <>
      <section className={compact ? 'space-y-6' : 'py-20 md:py-28 bg-card'}>
        <div className={compact ? '' : 'container'}>
          {compact ? (
            <div className="text-center mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-primary">Nossos Diferenciais</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Por que escolher a Três Lagoas Solar
              </p>
            </div>
          ) : (
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="text-center mb-16"
            >
              <span className="inline-block px-4 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-4">
                Diferenciais
              </span>
              <h2 className="text-3xl md:text-4xl font-black text-primary mb-4">
                Mais que instalar placas: entregamos segurança, performance e acompanhamento
              </h2>
              <p className="text-foreground/60 max-w-2xl mx-auto text-lg">
                Por que escolher a Três Lagoas Solar
              </p>
            </motion.div>
          )}

          <div className={`grid gap-4 ${compact ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6'}`}>
            {DIFERENCIAIS.map((d, i) => {
              const hasModal = !!d.modal;
              const cardContent = (
                <>
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mb-3 mx-auto shrink-0"
                    style={{ backgroundColor: 'hsl(43, 78%, 60%)' }}
                  >
                    <d.icon className="w-6 h-6" style={{ color: '#4A5A2A' }} />
                  </div>
                  <h3
                    className={`font-bold mb-2 text-center ${compact ? 'text-sm' : 'text-base'}`}
                    style={{ color: '#4A5A2A' }}
                  >
                    {d.title}
                  </h3>
                  <p className={`text-center leading-relaxed ${compact ? 'text-xs text-muted-foreground' : 'text-sm text-foreground/70'}`}>
                    {d.text}
                  </p>
                  {hasModal && (
                    <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </>
              );

              const baseClasses = `relative group rounded-xl border border-border/50 bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${
                hasModal ? 'cursor-pointer hover:border-secondary' : ''
              }`;

              if (compact) {
                return (
                  <div
                    key={i}
                    className={baseClasses}
                    onClick={() => {
                      if (d.modal?.type === 'image') setModalImg({ url: d.modal.url, alt: d.modal.alt });
                    }}
                  >
                    {cardContent}
                  </div>
                );
              }

              return (
                <motion.div
                  key={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={{ ...fadeUp, visible: { ...fadeUp.visible, transition: { duration: 0.5, delay: i * 0.08 } } }}
                  className={baseClasses}
                  onClick={() => {
                    if (d.modal?.type === 'image') setModalImg({ url: d.modal.url, alt: d.modal.alt });
                  }}
                >
                  {cardContent}
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Image Modal */}
      {modalImg && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setModalImg(null)}
        >
          <button className="absolute top-4 right-4 text-white hover:text-white/80 transition-colors">
            <X className="w-8 h-8" />
          </button>
          <img
            src={modalImg.url}
            alt={modalImg.alt}
            className="max-w-[90vw] max-h-[85vh] rounded-xl object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
