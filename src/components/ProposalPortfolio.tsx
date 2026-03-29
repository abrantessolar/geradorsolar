import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

const FALLBACK_PHOTOS = [
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

interface Photo {
  url: string;
  descricao?: string;
}

export default function ProposalPortfolio() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [current, setCurrent] = useState(0);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef(0);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('fotos_portfolio')
        .select('*')
        .eq('ativo', true)
        .order('criado_em', { ascending: true });
      if (data && data.length > 0) {
        setPhotos(data.map(d => ({ url: d.url, descricao: d.descricao || undefined })));
      } else {
        setPhotos(FALLBACK_PHOTOS.map(url => ({ url })));
      }
    }
    load();
  }, []);

  // Responsive: how many visible at once
  const getVisibleCount = () => {
    if (typeof window === 'undefined') return 3;
    if (window.innerWidth < 640) return 1;
    if (window.innerWidth < 1024) return 2;
    return 3;
  };
  const [visibleCount, setVisibleCount] = useState(getVisibleCount);

  useEffect(() => {
    const onResize = () => setVisibleCount(getVisibleCount());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const maxIndex = Math.max(0, photos.length - visibleCount);

  const scrollNext = useCallback(() => {
    setCurrent(c => (c >= maxIndex ? 0 : c + 1));
  }, [maxIndex]);

  const scrollPrev = useCallback(() => {
    setCurrent(c => (c <= 0 ? maxIndex : c - 1));
  }, [maxIndex]);

  // Autoplay
  useEffect(() => {
    if (isPaused || photos.length <= visibleCount) return;
    intervalRef.current = setInterval(scrollNext, 4000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPaused, scrollNext, photos.length, visibleCount]);

  // Lightbox keyboard
  useEffect(() => {
    if (lightboxIdx === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIdx(null);
      if (e.key === 'ArrowRight') setLightboxIdx(i => i !== null ? (i + 1) % photos.length : null);
      if (e.key === 'ArrowLeft') setLightboxIdx(i => i !== null ? (i - 1 + photos.length) % photos.length : null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxIdx, photos.length]);

  if (photos.length === 0) return null;

  const dotCount = maxIndex + 1;

  return (
    <section className="solar-card p-6 md:p-8 space-y-6 no-print">
      <div className="text-center">
        <h2 className="text-2xl font-bold" style={{ color: '#4A5A2A' }}>Alguns dos nossos projetos</h2>
      </div>

      <div
        className="relative"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={e => { touchStartX.current = e.touches[0].clientX; setIsPaused(true); }}
        onTouchEnd={e => {
          const diff = touchStartX.current - e.changedTouches[0].clientX;
          if (Math.abs(diff) > 50) diff > 0 ? scrollNext() : scrollPrev();
          setIsPaused(false);
        }}
      >
        {/* Arrows */}
        {photos.length > visibleCount && (
          <>
            <button
              onClick={scrollPrev}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-transform hover:scale-110"
              style={{ backgroundColor: '#4A5A2A' }}
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={scrollNext}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-transform hover:scale-110"
              style={{ backgroundColor: '#4A5A2A' }}
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          </>
        )}

        {/* Carousel */}
        <div className="overflow-hidden mx-4">
          <div
            className="flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${current * (100 / visibleCount)}%)` }}
          >
            {photos.map((photo, i) => (
              <div
                key={i}
                className="flex-shrink-0 px-2 cursor-pointer"
                style={{ width: `${100 / visibleCount}%` }}
                onClick={() => setLightboxIdx(i)}
              >
                <div className="overflow-hidden rounded-lg" style={{ height: visibleCount === 1 ? 220 : 280 }}>
                  <img
                    src={photo.url}
                    alt={photo.descricao || `Projeto ${i + 1}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dots */}
        {dotCount > 1 && (
          <div className="flex justify-center gap-1.5 mt-4">
            {Array.from({ length: dotCount }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className="w-2.5 h-2.5 rounded-full transition-colors"
                style={{ backgroundColor: i === current ? '#E8B84B' : '#ccc' }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center" onClick={() => setLightboxIdx(null)}>
          <button className="absolute top-4 right-4 text-white z-10"><X className="w-8 h-8" /></button>
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center bg-white/20 hover:bg-white/30 z-10"
            onClick={e => { e.stopPropagation(); setLightboxIdx(i => i !== null ? (i - 1 + photos.length) % photos.length : null); }}
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center bg-white/20 hover:bg-white/30 z-10"
            onClick={e => { e.stopPropagation(); setLightboxIdx(i => i !== null ? (i + 1) % photos.length : null); }}
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
          <img
            src={photos[lightboxIdx].url}
            alt={photos[lightboxIdx].descricao || ''}
            className="max-w-[90vw] max-h-[90vh] rounded-lg object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
}

// Export fallback URLs for PDF usage
export { FALLBACK_PHOTOS };
