import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { MessageCircle, ArrowLeft, HelpCircle } from 'lucide-react';
import FaqSection from '@/components/faq/FaqSection';
import logoImg from '@/assets/logo.png';

export default function FaqPage() {
  useEffect(() => {
    document.title = 'Dúvidas Frequentes | Três Lagoas Solar';
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border/30 shadow-sm">
        <div className="container flex items-center justify-between h-16">
          <a href="/" className="flex items-center gap-3">
            <img src={logoImg} alt="Três Lagoas Solar" className="h-10 w-auto" width={120} height={40} />
          </a>
          <Link to="/" className="flex items-center gap-2 text-sm font-medium text-foreground/80 hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar ao site
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-primary text-primary-foreground py-12">
        <div className="container max-w-3xl text-center">
          <HelpCircle className="w-10 h-10 mx-auto mb-3" />
          <h1 className="text-3xl md:text-4xl font-black mb-2">Dúvidas Frequentes</h1>
          <p className="text-primary-foreground/85">
            Respostas para as principais perguntas sobre energia solar, financiamento e concessionária.
          </p>
        </div>
      </section>

      {/* Conteúdo */}
      <main className="container max-w-3xl py-10 flex-1">
        <FaqSection contexto="site" busca />

        <div className="mt-10 rounded-2xl border border-border bg-card p-6 text-center space-y-3">
          <h2 className="text-lg font-bold text-foreground">Não encontrou o que procurava?</h2>
          <p className="text-sm text-muted-foreground">Fale com nossa equipe pelo WhatsApp, será um prazer te ajudar.</p>
          <a
            href="https://wa.me/5567996448995?text=Vim%20pela%20p%C3%A1gina%20de%20d%C3%BAvidas%20do%20site"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700"
          >
            <MessageCircle className="w-4 h-4" /> Falar no WhatsApp
          </a>
        </div>
      </main>

      <footer className="border-t border-border/30 py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Três Lagoas Solar — Energia Limpa
      </footer>
    </div>
  );
}
