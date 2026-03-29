import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Show skeleton placeholder while loading */
  skeleton?: boolean;
  /** Wrapper className for the skeleton container */
  wrapperClassName?: string;
}

export default function LazyImage({
  src,
  alt,
  className,
  skeleton = true,
  wrapperClassName,
  loading = 'lazy',
  ...props
}: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(loading !== 'lazy');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loading !== 'lazy' || !ref.current) {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [loading]);

  return (
    <div ref={ref} className={cn('relative overflow-hidden', wrapperClassName)}>
      {/* Skeleton placeholder */}
      {skeleton && !loaded && (
        <div className="absolute inset-0 bg-muted animate-pulse rounded-inherit" />
      )}
      {inView && (
        <img
          src={src}
          alt={alt || ''}
          className={cn(
            'transition-opacity duration-500',
            loaded ? 'opacity-100' : 'opacity-0',
            className
          )}
          onLoad={() => setLoaded(true)}
          loading={loading}
          decoding="async"
          {...props}
        />
      )}
    </div>
  );
}
