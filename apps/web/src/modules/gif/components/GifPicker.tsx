import React, { useMemo } from 'react';
import { GifEntry, GifPickerTab } from '../types';
import { GIF_LIBRARY } from '../constants/gifLibrary';
import { GifPickerSearch } from './GifPickerSearch';
import { GifPickerTabs } from './GifPickerTabs';
import { GifGrid } from './GifGrid';
import { GifPickerEmpty } from './GifPickerEmpty';
import { useGifSearch } from '../hooks/useGifSearch';
import { useGifFavorites } from '../hooks/useGifFavorites';
import { useGetRecentQuery } from '../../../store/api/gifApi';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface GifPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (gif: GifEntry) => void;
}

export const GifPicker: React.FC<GifPickerProps> = ({ isOpen, onClose, onSelect }) => {
  const activeTab = useSelector((state: RootState) => state.gif.activeTab);
  const query = useSelector((state: RootState) => state.gif.searchQuery);

  // Search Results hook
  const searchGifs = useGifSearch(query, activeTab);

  // Favorites hook
  const { favoriteIds } = useGifFavorites();

  // Recents query
  const { data: recentResponse } = useGetRecentQuery();
  const recentIds = recentResponse?.data || [];

  // Filter GIFs for special tabs (Favorites, Recent)
  const displayedGifs = useMemo(() => {
    if (query) return searchGifs;

    if (activeTab === 'favorites') {
      return GIF_LIBRARY.filter((gif) => favoriteIds.includes(gif.id));
    }
    if (activeTab === 'recent') {
      return GIF_LIBRARY.filter((gif) => recentIds.includes(gif.id))
        .sort((a, b) => recentIds.indexOf(a.id) - recentIds.indexOf(b.id)); // Maintain server usage order
    }
    return searchGifs;
  }, [activeTab, query, searchGifs, favoriteIds, recentIds]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 15, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 15, scale: 0.95 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="absolute bottom-full right-0 mb-3 w-full max-w-sm xs:max-w-md bg-surface/90 glass border border-border rounded-2xl shadow-elevated z-40 overflow-hidden flex flex-col p-3 gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200"
          role="dialog"
          aria-modal="true"
          aria-label="GIF Picker"
        >
          {/* Header */}
          <div className="flex justify-between items-center shrink-0">
            <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
              <span>👾</span> Inbuilt GIF Library
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
              aria-label="Close GIF Picker"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search bar */}
          <GifPickerSearch />

          {/* Tab Categories */}
          {!query && <GifPickerTabs />}

          {/* Content Area */}
          <div className="flex-1 overflow-hidden min-h-[220px]">
            {displayedGifs.length > 0 ? (
              <GifGrid gifs={displayedGifs} onSelect={onSelect} />
            ) : activeTab === 'favorites' ? (
              <GifPickerEmpty
                emoji="⭐"
                title="No Favorites Yet"
                description="Tap the star icon on any GIF inside the library to add it here."
              />
            ) : activeTab === 'recent' ? (
              <GifPickerEmpty
                emoji="⏰"
                title="No Recently Sent GIFs"
                description="GIFs you send will appear here for quick access next time."
              />
            ) : (
              <GifPickerEmpty
                emoji="🔍"
                title="No Matching GIFs"
                description="We couldn't find any GIFs matching your search. Try another keyword!"
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
