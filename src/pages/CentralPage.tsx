import SeoNoIndex from '@/components/SeoNoIndex';
import CentralEngine from '@/central/CentralEngine';
import logoColor from '@/assets/proposta-template/logo-tls-color.png';

/**
 * Central Inteligente — "Linktree inteligente" de atendimento/qualificação.
 * Hospedada em /central, fora da navegação principal e fora do sitemap
 * (SeoNoIndex aplica noindex,nofollow via meta tag, sem bloquear por
 * robots.txt — pode ser usada em Google Ads). Visualmente independente do
 * site institucional: não usa o <Layout /> com header/footer principal.
 */
export default function CentralPage() {
  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <SeoNoIndex />
      <div className="max-w-md mx-auto px-5 pt-6">
        <img src={logoColor} alt="Três Lagoas Solar" className="h-8" />
      </div>
      <CentralEngine />
    </div>
  );
}
