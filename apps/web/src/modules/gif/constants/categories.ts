import { GifCategory } from '../types';

export interface CategoryMetadata {
  id: GifCategory;
  label: string;
  emoji: string;
}

export const GIF_CATEGORIES: CategoryMetadata[] = [
  { id: 'trending', label: 'Trending', emoji: '⚡' },
  { id: 'funny', label: 'Funny', emoji: '😂' },
  { id: 'love', label: 'Love', emoji: '❤️' },
  { id: 'reactions', label: 'Reactions', emoji: '🎭' },
  { id: 'memes', label: 'Memes', emoji: '🤡' },
  { id: 'celebration', label: 'Celebration', emoji: '🎉' },
  { id: 'gaming', label: 'Gaming', emoji: '🎮' },
  { id: 'animals', label: 'Animals', emoji: '🐱' },
  { id: 'anime', label: 'Anime', emoji: '🌸' },
  { id: 'random', label: 'Random', emoji: '🎲' }
];
