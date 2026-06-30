import React from 'react';
import { Star } from 'lucide-react';
import { GifEntry } from '../types';
import { GifImage } from './GifImage';
import { useGifFavorites } from '../hooks/useGifFavorites';
import { cn } from '@zira/utils';

interface GifGridProps {
  gifs: GifEntry[];
  onSelect: (gif: GifEntry) => void;
}

export const GifGrid: React.FC<GifGridProps> = ({ gifs, onSelect }) => {
  const { isFavorite, toggleFavorite } = useGifFavorites();

  return (
    <div
      role="grid"
      aria-label="GIF Library grid"
      className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-3 gap-2 overflow-y-auto pr-1 max-h-[300px] min-h-[220px] custom-scrollbar"
    >
      {gifs.map((gif) => {
        const fav = isFavorite(gif.id);
        return (
          <div
            key={gif.id}
            role="gridcell"
            className="group relative h-28 cursor-pointer rounded-xl overflow-hidden shadow-sm hover:shadow-md border border-border/40 hover:border-primary-500/30 transition-all duration-200"
          >
            {/* Clickable GIF Area */}
            <div
              onClick={() => onSelect(gif)}
              className="w-full h-full"
              role="button"
              tabIndex={0}
              aria-label={`Send GIF ${gif.name}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onSelect(gif);
                }
              }}
            >
              <GifImage
                src={gif.path}
                alt={gif.name}
                className="group-hover:scale-105 transition-transform duration-300"
              />
            </div>

            {/* Floating Favorite Star */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(gif.id);
              }}
              className={cn(
                "absolute top-1.5 right-1.5 p-1.5 rounded-lg backdrop-blur-md transition-all duration-200",
                fav
                  ? "bg-yellow-500/90 text-white scale-100"
                  : "bg-black/35 text-white/80 opacity-0 group-hover:opacity-100 hover:bg-black/55"
              )}
              aria-label={fav ? `Remove ${gif.name} from favorites` : `Add ${gif.name} to favorites`}
            >
              <Star className={cn("w-3.5 h-3.5", fav && "fill-current")} />
            </button>

            {/* Bottom Tag Label (subtle overlay on hover) */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <span className="text-[10px] font-semibold text-white/95 truncate block">
                {gif.emoji} {gif.name}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
