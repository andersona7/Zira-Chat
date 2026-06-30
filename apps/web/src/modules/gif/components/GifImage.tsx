import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@zira/utils';

interface GifImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
}

export const GifImage: React.FC<GifImageProps> = ({ src, alt, className, ...props }) => {
  const [loaded, setLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden w-full h-full min-h-[80px] min-w-[80px] rounded-xl bg-surface-hover/50 flex items-center justify-center",
        !loaded && "animate-pulse"
      )}
    >
      {isInView && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setLoaded(true)}
          className={cn(
            "w-full h-full min-h-[80px] min-w-[80px] object-cover transition-opacity duration-300",
            loaded ? "opacity-100" : "opacity-0",
            className
          )}
          {...props}
        />
      )}
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};
