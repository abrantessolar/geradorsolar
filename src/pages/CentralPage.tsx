import { useEffect } from 'react';
import SeoNoIndex from '@/components/SeoNoIndex';
import CentralEngine from '@/central/CentralEngine';
import logoWhite from '@/assets/logo-central-enviado.png.asset.json';
import '@/central/central.css';

/**
 * Central Inteligente — "Linktree inteligente" de atendimento/qualificação.
 * Hospedada em /central, fora da navegação principal e fora do sitemap
 * (SeoNoIndex aplica noindex,nofollow via meta tag, sem bloquear por
 * robots.txt — pode ser usada em Google Ads). Visualmente independente do
 * site institucional: não usa o <Layout /> com header/footer principal.
 * O visual ("Diagnóstico Solar") usa Bricolage Grotesque + Figtree —
 * carregadas aqui, escopadas a esta página, pois o site institucional usa
 * outros pesos/combinação de fontes.
 */
export default function CentralPage() {
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=Figtree:wght@400;500;600;700&display=swap';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  return (
    <div className="central-app">
      <SeoNoIndex />
      <div className="ca-shell">
        <div className="ca-brand">
          <img src={logoWhite.url} alt="Três Lagoas Solar" />
          Três Lagoas Solar
        </div>
        <CentralEngine />
      </div>
    </div>
  );
}
