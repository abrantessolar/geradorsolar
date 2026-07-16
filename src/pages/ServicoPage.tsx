import { useEffect, useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageCircle, Phone, Mail, MapPin, Facebook, Instagram, ChevronDown, CheckCircle2, ArrowRight, Sun } from 'lucide-react';
import { getServicoBySlug, waLink, SERVICOS } from '@/data/servicos';
import logoImg from '@/assets/logo.png';

function useSeo(title: string, description: string) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;
    let meta = document.querySelector('meta[name="description"]');
    const prevDesc = meta?.getAttribute('content') || '';
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', description);
    return () => {
      document.title = prevTitle;
      meta?.setAttribute('content', prevDesc);
    };
  }, [title, description]);
}

export default function ServicoPage() {
  const { slug } = useParams<{ slug: string }>();
  const servico = slug ? getServicoBySlug(slug) : undefined;
  const [openServicos, setOpenServicos] = useState(false);

  if (!servico) return <Navigate to="/" replace />;

  useSeo(servico.seoTitle, servico.seoDescription);

  const whatsUrl = waLink(servico.whatsappMsg);
  const orcamentoUrl = waLink(`Olá! Gostaria de solicitar um orçamento de ${servico.title}.`);

  return (
    <div className="min-h-screen bg-background">
      {/* NAVBAR */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-b border-border/30 shadow-sm">
        <div className="container flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3">
            <img src={logoImg} alt="Três Lagoas Solar" className="h-10 w-auto" width={120} height={40} />
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link to="/" className="text-foreground/80 hover:text-primary transition-colors">Início</Link>
            <div
              className="relative"
              onMouseEnter={() => setOpenServicos(true)}
              onMouseLeave={() => setOpenServicos(false)}
            >
              <button className="flex items-center gap-1 text-primary font-semibold">
                Serviços <ChevronDown className="w-4 h-4" />
              </button>
              {openServicos && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-72 bg-card border border-border/50 rounded-xl shadow-xl py-2">
                  {SERVICOS.map(s => (
                    <Link
                      key={s.slug}
                      to={s.route}
                      className={`flex items-center gap-3 px-4 py-2 text-sm hover:bg-muted transition-colors ${s.slug === servico.slug ? 'text-primary font-semibold' : 'text-foreground/80'}`}
                    >
                      <span className="text-lg">{s.emoji}</span> {s.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <Link to="/faq" className="text-foreground/80 hover:text-primary transition-colors">❓ Dúvidas</Link>
          </nav>
          <div className="flex items-center gap-2">
            <a
              href={whatsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2 rounded-lg bg-green-600 text-white font-bold text-sm hover:bg-green-700 transition-all"
            >
              WhatsApp
            </a>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28" style={{ backgroundColor: '#4A5A2A' }}>
        <div className="container text-center max-w-3xl mx-auto text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="text-7xl md:text-8xl mb-6">{servico.emoji}</div>
            <h1 className="text-3xl md:text-5xl font-black mb-4 tracking-tight">{servico.title}</h1>
            <p className="text-lg md:text-xl text-white/80 mb-4">{servico.heroSubtitle}</p>
            {servico.heroDestaque && (
              <p className="text-xl md:text-2xl font-bold text-secondary mb-6">"{servico.heroDestaque}"</p>
            )}
            <a
              href={whatsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-4 px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl hover:scale-105"
              style={{ backgroundColor: '#E8B84B', color: '#4A5A2A' }}
            >
              <MessageCircle className="w-5 h-5" /> Falar com especialista
            </a>
          </motion.div>
        </div>
      </section>

      {/* O QUE É */}
      <section className="py-20 bg-card">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block px-4 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-4">
                O que é
              </span>
              <h2 className="text-3xl md:text-4xl font-black text-primary mb-6">Entenda o serviço</h2>
              <p className="text-foreground/70 leading-relaxed text-lg">{servico.oQueE}</p>
            </div>
            <div className="relative rounded-2xl overflow-hidden shadow-2xl aspect-[4/3] flex items-center justify-center" style={{ backgroundColor: '#4A5A2A' }}>
              <div className="text-[12rem] opacity-90">{servico.emoji}</div>
              <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-2xl flex items-center justify-center shadow-lg" style={{ backgroundColor: '#E8B84B' }}>
                <Sun className="w-10 h-10" style={{ color: '#4A5A2A' }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* QUANDO CONTRATAR */}
      <section className="py-20">
        <div className="container max-w-4xl">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1 rounded-full bg-secondary/10 text-secondary text-xs font-bold uppercase tracking-widest mb-4">
              Quando contratar
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-primary">Este serviço é para você se…</h2>
          </div>
          <ul className="grid md:grid-cols-2 gap-4">
            {servico.quandoContratar.map((item, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex items-start gap-3 p-4 rounded-xl border border-border/50 bg-card"
              >
                <CheckCircle2 className="w-6 h-6 shrink-0 mt-0.5" style={{ color: '#4A5A2A' }} />
                <span className="text-foreground/80">{item}</span>
              </motion.li>
            ))}
          </ul>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="py-20 bg-card">
        <div className="container max-w-3xl">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-4">
              Como funciona
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-primary">Nosso processo</h2>
          </div>
          <div className="relative">
            <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-border" />
            {servico.comoFunciona.map((etapa, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative flex gap-6 pb-8 last:pb-0"
              >
                <div
                  className="relative z-10 w-12 h-12 rounded-full flex items-center justify-center font-black text-lg shrink-0 shadow-md"
                  style={{ backgroundColor: '#E8B84B', color: '#4A5A2A' }}
                >
                  {i + 1}
                </div>
                <div className="flex-1 pt-2">
                  <p className="text-foreground/80 text-lg">{etapa}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-20" style={{ backgroundColor: '#E8B84B' }}>
        <div className="container text-center">
          <h2 className="text-3xl md:text-5xl font-black mb-6" style={{ color: '#4A5A2A' }}>
            Precisa deste serviço?
          </h2>
          <p className="text-lg mb-8 max-w-xl mx-auto" style={{ color: '#4A5A2A' }}>
            Fale com nossos especialistas e solicite um orçamento sem compromisso.
          </p>
          <a
            href={orcamentoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-10 py-4 rounded-xl font-bold text-lg text-white transition-all shadow-lg hover:shadow-xl hover:scale-105"
            style={{ backgroundColor: '#4A5A2A' }}
          >
            <MessageCircle className="w-5 h-5" /> Solicitar orçamento
          </a>
        </div>
      </section>

      {/* OUTROS SERVIÇOS */}
      <section className="py-16 bg-background">
        <div className="container">
          <h3 className="text-center text-xl font-bold text-primary mb-8">Conheça outros serviços</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {SERVICOS.filter(s => s.slug !== servico.slug).map(s => (
              <Link
                key={s.slug}
                to={s.route}
                className="p-5 rounded-xl border border-border/50 bg-card hover:border-secondary hover:-translate-y-1 hover:shadow-md transition-all text-center"
              >
                <div className="text-3xl mb-2">{s.emoji}</div>
                <div className="text-sm font-bold text-primary">{s.title}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* RODAPÉ */}
      <footer className="bg-foreground text-background py-16">
        <div className="container">
          <div className="grid md:grid-cols-4 gap-12">
            <div>
              <img src={logoImg} alt="Três Lagoas Solar" className="h-12 w-auto mb-4 brightness-200" width={144} height={48} loading="lazy" />
              <p className="text-background/60 text-sm leading-relaxed">
                Energia solar eficiente e sustentável para residências, comércios e propriedades rurais.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Contato</h3>
              <div className="space-y-3 text-sm text-background/70">
                <a href="tel:+5567996448995" className="flex items-center gap-2 hover:text-secondary transition-colors">
                  <Phone className="w-4 h-4" /> (67) 99644-8995
                </a>
                <a href="mailto:contato@treslagoassolar.com.br" className="flex items-center gap-2 hover:text-secondary transition-colors">
                  <Mail className="w-4 h-4" /> contato@treslagoassolar.com.br
                </a>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>Rua Luiz Corrêa da Silveira, 934<br />Jardim Alvorada — Três Lagoas/MS<br />79610-060</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Serviços Especializados</h3>
              <ul className="space-y-2 text-sm text-background/70">
                {SERVICOS.map(s => (
                  <li key={s.slug}>
                    <Link to={s.route} className="hover:text-secondary transition-colors flex items-center gap-2">
                      <ArrowRight className="w-3 h-3" /> {s.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Redes Sociais</h3>
              <div className="flex gap-4">
                <a href="http://www.facebook.com/treslagoassolar" target="_blank" rel="noopener noreferrer"
                  className="w-10 h-10 rounded-lg bg-background/10 flex items-center justify-center hover:bg-secondary hover:text-secondary-foreground transition-all">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="https://www.instagram.com/treslagoassolar" target="_blank" rel="noopener noreferrer"
                  className="w-10 h-10 rounded-lg bg-background/10 flex items-center justify-center hover:bg-secondary hover:text-secondary-foreground transition-all">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="https://wa.me/5567996448995" target="_blank" rel="noopener noreferrer"
                  className="w-10 h-10 rounded-lg bg-background/10 flex items-center justify-center hover:bg-green-600 transition-all">
                  <MessageCircle className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-background/10 text-center text-sm text-background/40">
            © {new Date().getFullYear()} Três Lagoas Solar — Todos os direitos reservados
          </div>
        </div>
      </footer>

      {/* WHATSAPP FLOATING */}
      <a
        href={whatsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg hover:bg-green-600 hover:scale-110 transition-all"
        title="WhatsApp"
      >
        <MessageCircle className="w-7 h-7" />
      </a>
    </div>
  );
}
