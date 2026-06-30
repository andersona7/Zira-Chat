import React, { useState } from 'react';
import { Search, X, Clock } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../store';
import { setSearchQuery, addRecentSearch, clearRecentSearches } from '../../../store/slices/gifSlice';
import { AnimatePresence, motion } from 'framer-motion';

export const GifPickerSearch: React.FC = () => {
  const query = useSelector((state: RootState) => state.gif.searchQuery);
  const recentSearches = useSelector((state: RootState) => state.gif.recentSearches);
  const [showRecent, setShowRecent] = useState(false);
  const dispatch = useDispatch();

  const handleSearchSubmit = (val: string) => {
    dispatch(setSearchQuery(val));
    if (val.trim()) {
      dispatch(addRecentSearch(val));
    }
    setShowRecent(false);
  };

  const handleClear = () => {
    dispatch(setSearchQuery(''));
    setShowRecent(false);
  };

  return (
    <div className="relative w-full">
      <div className="relative flex items-center bg-surface-hover/75 border border-border/40 focus-within:border-primary-500/40 rounded-xl transition-all">
        <Search className="absolute left-3 w-4 h-4 text-text-muted" />
        <input
          type="text"
          value={query}
          onFocus={() => setShowRecent(true)}
          onBlur={() => setTimeout(() => setShowRecent(false), 200)}
          onChange={(e) => dispatch(setSearchQuery(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSearchSubmit(query);
            }
          }}
          placeholder="Search GIFs by tag, category or emoji..."
          className="w-full bg-transparent pl-9 pr-8 py-2 text-xs text-text-primary placeholder:text-text-muted/60 focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 p-1 rounded-full text-text-muted hover:text-text-primary hover:bg-surface"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Recent searches dropdown */}
      <AnimatePresence>
        {showRecent && recentSearches.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute top-full left-0 right-0 mt-1.5 p-2 bg-surface glass border border-border/80 rounded-xl shadow-elevated z-50 max-h-48 overflow-y-auto"
          >
            <div className="flex justify-between items-center px-2 pb-1.5 border-b border-border/40 mb-1.5">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Recent Searches</span>
              <button
                type="button"
                onClick={() => dispatch(clearRecentSearches())}
                className="text-[10px] text-primary-500 hover:underline"
              >
                Clear all
              </button>
            </div>
            <div className="flex flex-col gap-0.5">
              {recentSearches.map((search) => (
                <button
                  key={search}
                  type="button"
                  onMouseDown={() => handleSearchSubmit(search)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
                >
                  <Clock className="w-3.5 h-3.5 text-text-muted" />
                  <span>{search}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
