import { configureStore, combineReducers, Middleware } from '@reduxjs/toolkit';
import { 
  persistStore, 
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import { idbStorage } from './storage';

import authReducer from './slices/authSlice';
import chatReducer from './slices/chatSlice';
import callReducer from './slices/callSlice';
import gifReducer from './slices/gifSlice';
import { baseApi } from './api/baseQuery';

const appReducer = combineReducers({
  auth: authReducer,
  chat: chatReducer,
  call: callReducer,
  gif: gifReducer,
  [baseApi.reducerPath]: baseApi.reducer,
});

const rootReducer = (
  state: ReturnType<typeof appReducer> | undefined,
  action: { type: string }
) => {
  if (action.type === 'auth/logout') {
    state = undefined;
  }
  return appReducer(state, action);
};

const persistConfig = {
  key: 'zira-root',
  storage: idbStorage,
  whitelist: ['auth', 'chat', 'gif'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

let persistorInstance: ReturnType<typeof persistStore> | null = null;

const logoutMiddleware: Middleware = (store) => (next) => (action) => {
  if (action.type === 'auth/logout') {
    store.dispatch(baseApi.util.resetApiState());
    if (persistorInstance) {
      void persistorInstance.purge();
    }
  }
  return next(action);
};

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore redux-persist actions for serializable checks
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(baseApi.middleware, logoutMiddleware),
});

export const persistor = persistStore(store);
persistorInstance = persistor;

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
