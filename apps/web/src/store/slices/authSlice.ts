import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { User } from '@zira/types';

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  status: AuthStatus;
  hasHydratedAuth: boolean;
  blockedBy: string[]; // List of user IDs who have blocked the current user
  forceLogoutReason: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  status: 'idle',
  hasHydratedAuth: false,
  blockedBy: [],
  forceLogoutReason: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; accessToken: string }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.accessToken;
      state.isAuthenticated = true;
      state.status = 'authenticated';
      state.hasHydratedAuth = true;
      state.blockedBy = action.payload.user.blockedBy || [];
      state.forceLogoutReason = null;
    },
    setAuthLoading: (state) => {
      state.status = 'loading';
    },
    markAuthHydrated: (state) => {
      state.hasHydratedAuth = true;
      if (!state.isAuthenticated) {
        state.status = 'unauthenticated';
      }
    },
    logout: (state, action: PayloadAction<{ reason?: string } | undefined>) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.status = 'unauthenticated';
      state.hasHydratedAuth = true;
      state.blockedBy = [];
      state.forceLogoutReason = action?.payload?.reason || null;
    },
    clearForceLogoutReason: (state) => {
      state.forceLogoutReason = null;
    },
    updateBlockedUsers: (state, action: PayloadAction<string[]>) => {
      if (state.user) {
        state.user.blockedUsers = action.payload;
      }
    },
    setBlockedBy: (state, action: PayloadAction<string[]>) => {
      state.blockedBy = action.payload;
    },
    addBlockedBy: (state, action: PayloadAction<string>) => {
      if (!state.blockedBy.includes(action.payload)) {
        state.blockedBy.push(action.payload);
      }
    },
    removeBlockedBy: (state, action: PayloadAction<string>) => {
      state.blockedBy = state.blockedBy.filter(id => id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder.addCase('persist/REHYDRATE', (state, action: any) => {
      if (action.payload && action.payload.auth) {
        return {
          ...state,
          ...action.payload.auth,
          hasHydratedAuth: false,
          status: 'idle',
        };
      }
      return state;
    });
  },
});

export const { 
  setCredentials, 
  setAuthLoading,
  markAuthHydrated,
  logout, 
  clearForceLogoutReason,
  updateBlockedUsers, 
  setBlockedBy, 
  addBlockedBy, 
  removeBlockedBy 
} = authSlice.actions;
export default authSlice.reducer;
