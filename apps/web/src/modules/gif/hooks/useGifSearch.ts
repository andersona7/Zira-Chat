import { useMemo } from 'react';
import { GIF_LIBRARY } from '../constants/gifLibrary';
import { GifEntry, GifCategory } from '../types';

export const useGifSearch = (query: string, activeTab: string) => {
  return useMemo(() => {
    let results = GIF_LIBRARY;
    const cleanQuery = query.trim().toLowerCase();

    // 1. If searching, apply query search globally (ignore tab category filter)
    if (cleanQuery) {
      results = results.filter((gif) => {
        // Search in tag, emoji, category, name
        return (
          gif.name.toLowerCase().includes(cleanQuery) ||
          gif.emoji.includes(cleanQuery) ||
          gif.tags.some((tag) => tag.toLowerCase().includes(cleanQuery)) ||
          gif.categories.some((cat) => cat.toLowerCase().includes(cleanQuery))
        );
      });
      return results;
    }

    // 2. If no search query, filter by category tab
    if (activeTab && activeTab !== 'favorites' && activeTab !== 'recent') {
      results = results.filter((gif) =>
        gif.categories.includes(activeTab as GifCategory)
      );
    }

    return results;
  }, [query, activeTab]);
};
