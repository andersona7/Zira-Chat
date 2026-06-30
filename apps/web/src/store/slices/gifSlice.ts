import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { GifState, GifPickerTab } from '../../modules/gif/types';

const initialState: GifState = {
  isPickerOpen: false,
  activeTab: 'trending',
  searchQuery: '',
  recentSearches: [],
};

const gifSlice = createSlice({
  name: 'gif',
  initialState,
  reducers: {
    setPickerOpen(state, action: PayloadAction<boolean>) {
      state.isPickerOpen = action.payload;
    },
    setActiveTab(state, action: PayloadAction<GifPickerTab>) {
      state.activeTab = action.payload;
    },
    setSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
    },
    addRecentSearch(state, action: PayloadAction<string>) {
      const search = action.payload.trim().toLowerCase();
      if (!search) return;
      
      // Filter out existing and keep only top 10 recent searches
      state.recentSearches = [
        search,
        ...state.recentSearches.filter((s) => s !== search),
      ].slice(0, 10);
    },
    clearRecentSearches(state) {
      state.recentSearches = [];
    },
    resetPickerState(state) {
      state.searchQuery = '';
      state.activeTab = 'trending';
    },
  },
});

export const {
  setPickerOpen,
  setActiveTab,
  setSearchQuery,
  addRecentSearch,
  clearRecentSearches,
  resetPickerState,
} = gifSlice.actions;

export default gifSlice.reducer;
