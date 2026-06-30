import { get, set, del } from 'idb-keyval';

/**
 * Custom storage engine for redux-persist using IndexedDB via idb-keyval.
 * This allows us to store large amounts of Redux state (like chat histories)
 * asynchronously without blocking the main thread or hitting LocalStorage limits.
 */
export const idbStorage = {
  getItem: async (key: string) => {
    const value = await get(key);
    return value;
  },
  setItem: async (key: string, value: any) => {
    await set(key, value);
  },
  removeItem: async (key: string) => {
    await del(key);
  },
};