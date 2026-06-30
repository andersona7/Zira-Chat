import React from 'react';
import { GIF_CATEGORIES } from '../constants/categories';
import { GifPickerTab } from '../types';
import { Star, Clock } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../store';
import { setActiveTab } from '../../../store/slices/gifSlice';
import { cn } from '@zira/utils';
import { motion } from 'framer-motion';

export const GifPickerTabs: React.FC = () => {
  const active = useSelector((state: RootState) => state.gif.activeTab);
  const dispatch = useDispatch();

  const handleTabClick = (tab: GifPickerTab) => {
    dispatch(setActiveTab(tab));
  };

  return (
    <div className="flex items-center gap-1.5 border-b border-border/40 pb-2 overflow-x-auto custom-scrollbar shrink-0 select-none">
      {/* Favorites Tab */}
      <button
        type="button"
        onClick={() => handleTabClick('favorites')}
        className={cn(
          "relative flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0",
          active === 'favorites' ? "text-primary-500" : "text-text-muted hover:text-text-primary hover:bg-surface-hover"
        )}
      >
        <Star className="w-3.5 h-3.5" />
        <span>Favorites</span>
        {active === 'favorites' && (
          <motion.div
            layoutId="activeTabIndicator"
            className="absolute inset-0 bg-primary-500/10 rounded-full border border-primary-500/20 -z-10"
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          />
        )}
      </button>

      {/* Recent Tab */}
      <button
        type="button"
        onClick={() => handleTabClick('recent')}
        className={cn(
          "relative flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0",
          active === 'recent' ? "text-primary-500" : "text-text-muted hover:text-text-primary hover:bg-surface-hover"
        )}
      >
        <Clock className="w-3.5 h-3.5" />
        <span>Recent</span>
        {active === 'recent' && (
          <motion.div
            layoutId="activeTabIndicator"
            className="absolute inset-0 bg-primary-500/10 rounded-full border border-primary-500/20 -z-10"
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          />
        )}
      </button>

      {/* Vertical separator */}
      <div className="w-px h-5 bg-border/60 shrink-0 mx-1" />

      {/* Category Tabs */}
      {GIF_CATEGORIES.map((cat) => {
        const isSelected = active === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => handleTabClick(cat.id)}
            className={cn(
              "relative flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0",
              isSelected ? "text-primary-500" : "text-text-muted hover:text-text-primary hover:bg-surface-hover"
            )}
          >
            <span>{cat.emoji}</span>
            <span>{cat.label}</span>
            {isSelected && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute inset-0 bg-primary-500/10 rounded-full border border-primary-500/20 -z-10"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};
