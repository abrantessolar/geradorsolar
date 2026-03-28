import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageCircle, Phone, Mail, MapPin, Facebook, Instagram, ChevronDown, X, Sun, Zap, Leaf, Tractor, Building, Home, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import PublicSimulator from '@/components/PublicSimulator';

const LOGO_URL = 'https://static.wixstatic.com/media/c2ae0d_30cd8efa4a3c4fbab3622fcd674c4d02~mv2.png';
const HERO_BG = 'https://static.wixstatic.com/media/c2ae0d_0fc9044d218948a585d2170345d4ce87~mv2.jpg';
const MISSION_IMG = 'https://static.wixstatic.com/media/11062b_bdefce897daa4bafad009726c2eae2df~mv2.jpg';

const SOLUTIONS = [
  {
    title: 'SISTEMAS RESIDENCIAIS',
    image: 'https://static.wixstatic.com/media/c2ae0d_22207624d8e94b8c924339ec7f85d44c~mv2.png',
    alt: 'Instalação de painéis solares residencial em Três Lagoas',
    text: 'Nossos sistemas solares residenciais são projetados para fornecer energia limpa e renovável para residências de todos os tamanhos, reduzindo a dependência da rede elétrica convencional.',
    btn: 'Solicitar Orçamento',
    link: 'https://wa.me/5567996448995?text=Vim pelo site e gostaria de um orçamento',
    icon: Home,
  },
  {
    title: 'SISTEMAS COMERCIAIS',
    image: 'https://static.wixstatic.com/media/c2ae0d_a5032014b84c4287889fcf5fe1522b78~mv2.jpg',
    alt: 'Sistema solar comercial Três Lagoas Solar',
    text: 'Ajudamos empresas a adotar soluções de energia solar personalizadas, visando reduzir custos operacionais e diminuir a pegada de carbono.',
    btn: 'Fale Conosco',
    link: 'https://wa.me/5567996448995?text=Vim pelo site e gostaria de um orçamento',
    icon: Building,
  },
  {
    title: 'SISTEMAS AGRÍCOLAS',
    image: 'https://static.wixstatic.com/media/c2ae0d_00abcb22b6d74820b004da41552f658c~mv2.png',
    alt: 'Energia solar rural Mato Grosso do Sul',
    text: 'Nossos sistemas solares são adaptados para atender às necessidades energéticas de propriedades rurais, proporcionando autonomia e eficiência energética. Conciliamos energia solar com rede e geradores à diesel!',
    btn: 'Agro Atendimento',
    link: 'https://wa.me/5567996448995?text=Gostaria de um AgroAtendimento',
    icon: Tractor,
  },
];

// Fallback static data (used when DB is empty)
const STATIC_PARTNER_NAMES = ['Parceiro fabricante de inversores solares', 'Parceiro distribuidor de equipamentos solares', 'Parceiro financiamento energia solar'];
const STATIC_PARTNERS = [
  'https://static.wixstatic.com/media/c2ae0d_e25309823c3f4aaa8742595e14b12485~mv2.png',
  'https://static.wixstatic.com/media/c2ae0d_b930ee5eefab44e8ad6967703ce7b914~mv2.png',
  'https://static.wixstatic.com/media/c2ae0d_cd3adde29feb4f6ba61eccb1f0e321e1~mv2.png',
];

const STATIC_PORTFOLIO = [
  'https://static.wixstatic.com/media/c2ae0d_6c371c31aaf648c7be252aaff996c7f1~mv2.jpg',
  'https://static.wixstatic.com/media/c2ae0d_6ee05018660840b5a51c119a569c78cf~mv2.jpg',
  'https://static.wixstatic.com/media/c2ae0d_3e01f00f92804e79ac321e54ad8f4d75~mv2.jpg',
  'https://static.wixstatic.com/media/c2ae0d_f34af88f3c894e7ebdea7c4dc5ae1506~mv2.webp',
  'https://static.wixstatic.com/media/c2ae0d_38d5e6b8486a40228b73b482bdf26699~mv2.jpg',
  'https://static.wixstatic.com/media/c2ae0d_3b4fafa34c894b698bd0dcc55bd75b4e~mv2.jpg',
  'https://static.wixstatic.com/media/c2ae0d_94619d4e226649a89d04543cd140ecaf~mv2.jpg',
  'https://static.wixstatic.com/media/c2ae0d_0133537425cf4bb89bced5865cc8121f~mv2.jpg',
  'https://static.wixstatic.com/media/c2ae0d_4916c426de1a4302b0b9d4e36ab1085a~mv2.jpg',
  'https://static.wixstatic.com/media/c2ae0d_728ba9223c1a4097bbc00519129fae08~mv2.jpg',
  'https://static.wixstatic.com/media/c2ae0d_a39bd5c40b7548248101a986677e534a~mv2.jpg',
  'https://static.wixstatic.com/media/c2ae0d_894355b5cb6445ba9c1277ddecfb6ec6~mv2.png',
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

export default function LandingPage() {
  const simulatorRef = useRef<HTMLDivElement>(null);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  // Dynamic content from database
  const [portfolioPhotos, setPortfolioPhotos] = useState<{ url: string; descricao: string | null }[]>([]);
  const [partnerLogos, setPartnerLogos] = useState<{ url: string; nome: string; url_site: string | null }[]>([]);

  useEffect(() => {
    // Load portfolio photos
    supabase.from('fotos_portfolio').select('url, descricao').eq('ativo', true).order('ordem')
      .then(({ data }) => {
        if (data && data.length > 0) setPortfolioPhotos(data as any);
      });
    // Load partner logos
    supabase.from('logos_parceiros').select('url, nome, url_site').eq('ativo', true).order('ordem')
      .then(({ data }) => {
        if (data && data.length > 0) setPartnerLogos(data as any);
      });
  }, []);

  // Use DB data if available, else fallback to static
  const portfolio = portfolioPhotos.length > 0 ? portfolioPhotos.map(p => p.url) : STATIC_PORTFOLIO;
  const portfolioDescs = portfolioPhotos.length > 0 ? portfolioPhotos.map(p => p.descricao) : null;
  const partners = partnerLogos.length > 0 ? partnerLogos : STATIC_PARTNERS.map((url, i) => ({ url, nome: STATIC_PARTNER_NAMES[i], url_site: null }));

  const scrollToSimulator = () => {
    simulatorRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ─── NAVBAR ─── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-b border-border/30 shadow-sm">
        <div className="container flex items-center justify-between h-16">
          <a href="/" className="flex items-center gap-3">
            <img src={LOGO_URL} alt="Três Lagoas Solar" className="h-10 w-auto" />
          </a>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <a href="#missao" className="text-foreground/80 hover:text-primary transition-colors">Nossa Missão</a>
            <a href="#solucoes" className="text-foreground/80 hover:text-primary transition-colors">Soluções</a>
            <a href="#projetos" className="text-foreground/80 hover:text-primary transition-colors">Projetos</a>
            <button onClick={scrollToSimulator} className="text-foreground/80 hover:text-primary transition-colors">Simular</button>
          </nav>
          <Link
            to="/login"
            className="px-5 py-2 rounded-lg bg-secondary text-secondary-foreground font-bold text-sm hover:bg-secondary/90 transition-all"
          >
            Área do Consultor
          </Link>
        </div>
      </header>

      {/* ─── HERO ─── */}
      <section className="relative min-h-screen flex items-center justify-center pt-16">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO_BG})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <motion.div initial="hidden" animate="visible" variants={fadeUp}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/20 backdrop-blur-sm border border-secondary/30 text-secondary mb-6">
              <Zap className="w-4 h-4" />
              <span className="text-sm font-semibold">Energia Solar em Três Lagoas e Região</span>
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-6 tracking-tight">
              ENERGIA SOLAR EM<br />
              <span className="text-secondary">TRÊS LAGOAS</span>/MS
            </h1>
            <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-10">
              Soluções em energia solar para residências, comércios e propriedades rurais em Três Lagoas e região.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="https://wa.me/5567996448995"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-8 py-4 rounded-xl bg-green-600 text-white font-bold text-lg hover:bg-green-700 transition-all shadow-lg hover:shadow-xl"
              >
                <MessageCircle className="w-5 h-5" /> Falar no WhatsApp
              </a>
              <button
                onClick={scrollToSimulator}
                className="flex items-center gap-2 px-8 py-4 rounded-xl bg-secondary text-secondary-foreground font-bold text-lg hover:bg-secondary/90 transition-all shadow-lg hover:shadow-xl"
              >
                <Sun className="w-5 h-5" /> Simule seu projeto
              </button>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.8 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
          >
            <ChevronDown className="w-8 h-8 text-white/60 animate-bounce" />
          </motion.div>
        </div>
      </section>

      {/* ─── MISSÃO ─── */}
      <section id="missao" className="py-20 md:py-28 bg-card">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeUp}
            className="grid md:grid-cols-2 gap-12 items-center"
          >
            <div>
              <span className="inline-block px-4 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-4">
                Quem somos
              </span>
              <h2 className="text-3xl md:text-4xl font-black text-primary mb-6">Nossa Missão</h2>
              <p className="text-foreground/70 leading-relaxed text-lg">
                Estamos comprometidos em revolucionar a forma como as pessoas utilizam a energia através de soluções inovadoras e sustentáveis. Nosso foco está em oferecer tecnologia de ponta e serviços que permitam aos nossos clientes gerar e consumir energia de forma mais eficiente e amigável ao meio ambiente.
              </p>
              <div className="mt-8 flex items-center gap-6">
                <div className="text-center">
                  <div className="text-3xl font-black text-primary">500+</div>
                  <div className="text-sm text-muted-foreground">Projetos</div>
                </div>
                <div className="w-px h-12 bg-border" />
                <div className="text-center">
                  <div className="text-3xl font-black text-secondary">98%</div>
                  <div className="text-sm text-muted-foreground">Satisfação</div>
                </div>
                <div className="w-px h-12 bg-border" />
                <div className="text-center">
                  <div className="text-3xl font-black text-primary">5+</div>
                  <div className="text-sm text-muted-foreground">Anos</div>
                </div>
              </div>
            </div>
            <div className="relative">
              <img
                src={MISSION_IMG}
                alt="Instalação de painéis solares residencial em Três Lagoas"
                className="rounded-2xl shadow-2xl w-full object-cover aspect-[4/3]"
                loading="lazy"
              />
              <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-2xl bg-secondary flex items-center justify-center shadow-lg">
                <Leaf className="w-10 h-10 text-secondary-foreground" />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── SOLUÇÕES ─── */}
      <section id="solucoes" className="py-20 md:py-28">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-16">
            <span className="inline-block px-4 py-1 rounded-full bg-secondary/10 text-secondary text-xs font-bold uppercase tracking-widest mb-4">
              O que fazemos
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-primary mb-4">Soluções em Energia Solar</h2>
            <p className="text-foreground/60 max-w-2xl mx-auto text-lg">
              Oferecemos uma ampla gama de produtos e serviços voltados para energia solar
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {SOLUTIONS.map((sol, i) => (
              <motion.div
                key={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={{ ...fadeUp, visible: { ...fadeUp.visible, transition: { duration: 0.6, delay: i * 0.15 } } }}
                className="group solar-card overflow-hidden"
              >
                <div className="relative h-56 overflow-hidden">
                  <img src={sol.image} alt={sol.alt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4 flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                      <sol.icon className="w-5 h-5 text-secondary-foreground" />
                    </div>
                    <h3 className="text-white font-bold text-lg">{sol.title}</h3>
                  </div>
                </div>
                <div className="p-6">
                  <p className="text-foreground/70 text-sm leading-relaxed mb-6">{sol.text}</p>
                  <a
                    href={sol.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 solar-btn-primary text-sm py-2 px-5"
                  >
                    {sol.btn} <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PARCEIROS ─── */}
      <section className="py-16 bg-card border-y border-border/30">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-black text-primary">NOSSOS PARCEIROS</h2>
          </motion.div>
          <div className="flex items-center justify-center gap-12 flex-wrap">
            {PARTNERS.map((p, i) => (
              <motion.img
                key={i}
                src={p}
                alt={PARTNER_NAMES[i]}
                className="h-16 md:h-20 w-auto object-contain grayscale hover:grayscale-0 transition-all duration-300"
                loading="lazy"
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ─── PORTFÓLIO ─── */}
      <section id="projetos" className="py-20 md:py-28">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-16">
            <span className="inline-block px-4 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-4">
              Portfólio
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-primary">Nossos Projetos</h2>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {PORTFOLIO.map((img, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="relative aspect-square overflow-hidden rounded-xl cursor-pointer group"
                onClick={() => setLightboxImg(img)}
              >
                <img src={img} alt={`Projeto de energia solar ${i + 1} em Três Lagoas MS`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/30 transition-colors duration-300" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Lightbox */}
      {lightboxImg && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={() => setLightboxImg(null)}>
          <button className="absolute top-4 right-4 text-white/80 hover:text-white" onClick={() => setLightboxImg(null)}>
            <X className="w-8 h-8" />
          </button>
          <img src={lightboxImg} alt="Projeto de energia solar Três Lagoas Solar" className="max-w-full max-h-[90vh] object-contain rounded-lg" />
        </div>
      )}

      {/* ─── SIMULADOR PÚBLICO ─── */}
      <div ref={simulatorRef}>
        <PublicSimulator />
      </div>

      {/* ─── CTA FINAL ─── */}
      <section className="py-20 md:py-28 bg-primary text-primary-foreground">
        <div className="container text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
            <Zap className="w-12 h-12 text-secondary mx-auto mb-6" />
            <h2 className="text-3xl md:text-5xl font-black mb-4">
              PRONTO PARA ECONOMIZAR<br />NA CONTA DE LUZ?
            </h2>
            <p className="text-primary-foreground/70 text-lg max-w-xl mx-auto mb-10">
              Faça uma simulação gratuita agora e descubra quanto você pode economizar.
            </p>
            <button
              onClick={scrollToSimulator}
              className="inline-flex items-center gap-2 px-10 py-4 rounded-xl bg-secondary text-secondary-foreground font-bold text-lg hover:bg-secondary/90 transition-all shadow-lg hover:shadow-xl"
            >
              <Sun className="w-5 h-5" /> Simular agora
            </button>
          </motion.div>
        </div>
      </section>

      {/* ─── RODAPÉ ─── */}
      <footer className="bg-foreground text-background py-16">
        <div className="container">
          <div className="grid md:grid-cols-3 gap-12">
            <div>
              <img src={LOGO_URL} alt="Logo Três Lagoas Solar energia solar" className="h-12 w-auto mb-4 brightness-200" />
              <p className="text-background/60 text-sm leading-relaxed">
                Energia solar eficiente e sustentável para residências, comércios e propriedades rurais.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Contato</h3>
              <div className="space-y-3 text-sm text-background/70">
                <a href="tel:+5567996448995" className="flex items-center gap-2 hover:text-secondary transition-colors">
                  <Phone className="w-4 h-4" /> (67) 9 9644-8995
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

      {/* ─── BOTÃO FLUTUANTE WHATSAPP ─── */}
      <a
        href="https://wa.me/5567996448995"
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
