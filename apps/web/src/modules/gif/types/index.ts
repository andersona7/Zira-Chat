export type GifCategory =
  | 'trending'
  | 'funny'
  | 'love'
  | 'reactions'
  | 'memes'
  | 'celebration'
  | 'gaming'
  | 'animals'
  | 'anime'
  | 'random';

export interface GifEntry {
  id: string;
  name: string;
  categories: GifCategory[];
  tags: string[];
  emoji: string;
  path: string;
}

export type GifPickerTab = GifCategory | 'favorites' | 'recent';

export interface GifState {
  isPickerOpen: boolean;
  activeTab: GifPickerTab;
  searchQuery: string;
  recentSearches: string[];
}
