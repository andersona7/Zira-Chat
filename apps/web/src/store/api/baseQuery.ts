import {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
  createApi,
  fetchBaseQuery,
} from '@reduxjs/toolkit/query/react';
import { logout, setCredentials } from '../slices/authSlice';
import type { RootState } from '../index';

type RetryableArgs = FetchArgs & { _retry?: boolean };
type RefreshResponse = { success: boolean; data?: { accessToken: string } };
type ErrorWithMessage = FetchBaseQueryError & { error?: string };

const RETRYABLE_METHODS = new Set(['GET', 'HEAD']);
const REFRESH_PATH = '/auth/refresh';
const AUTH_EXCLUDED_PATHS = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/send-otp',
  '/auth/verify-otp',
  '/auth/forgot-password/send-otp',
  '/auth/forgot-password/verify-otp',
  '/auth/forgot-password/reset',
  '/auth/logout',
  REFRESH_PATH,
]);

let refreshPromise: Promise<string | null> | null = null;

const getCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);

  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() ?? null;
  }

  return null;
};

const normalizeArgs = (args: string | FetchArgs): RetryableArgs =>
  typeof args === 'string' ? { url: args } : { ...args };

const isNetworkFailure = (error?: FetchBaseQueryError): boolean =>
  error?.status === 'FETCH_ERROR' || error?.status === 'TIMEOUT_ERROR';

const shouldRetry = (args: RetryableArgs, error?: FetchBaseQueryError): boolean => {
  if (!error) {
    return false;
  }

  const method = (args.method ?? 'GET').toUpperCase();

  if (!RETRYABLE_METHODS.has(method)) {
    return false;
  }

  if (isNetworkFailure(error)) {
    return true;
  }

  return error.status === 429 || error.status === 500;
};

const wait = async (signal: AbortSignal | undefined, delayMs: number) =>
  new Promise<void>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      signal?.removeEventListener('abort', abortListener);
      resolve();
    }, delayMs);

    const abortListener = () => {
      window.clearTimeout(timeoutId);
      reject(new DOMException('The operation was aborted.', 'AbortError'));
    };

    signal?.addEventListener('abort', abortListener, { once: true });
  });

const rawBaseQuery = fetchBaseQuery({
  baseUrl: '/api/v1',
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const state = getState() as RootState;
    const token = state.auth.token;
    const lockerToken = state.chat.lockerToken;
    const csrfToken = getCookie('zira_csrf');

    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }

    if (lockerToken) {
      headers.set('x-locker-token', lockerToken);
    }

    if (csrfToken) {
      headers.set('x-csrf-token', csrfToken);
    }

    return headers;
  },
});

type BaseQueryResult = Awaited<ReturnType<typeof rawBaseQuery>>;

const executeWithRetry = async (
  args: RetryableArgs,
  api: Parameters<BaseQueryFn>[1],
  extraOptions: Parameters<BaseQueryFn>[2]
) => {
  let attempt = 0;
  let result = await rawBaseQuery(args, api, extraOptions);

  while (attempt < 2 && shouldRetry(args, result.error)) {
    attempt += 1;
    await wait(api.signal, 250 * attempt);
    result = await rawBaseQuery(args, api, extraOptions);
  }

  return result;
};

export const executeTokenRefresh = async (): Promise<string | null> => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch('/api/v1/auth/refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
        if (!response.ok) {
          return null;
        }
        const payload = await response.json();
        const accessToken = payload.data?.accessToken ?? null;
        const { store } = await import('../index');
        const state = store.getState() as RootState;
        const currentUser = state.auth.user;
        if (!accessToken || !currentUser) {
          return null;
        }
        store.dispatch(setCredentials({ user: currentUser, accessToken }));
        return accessToken;
      } catch (err) {
        console.error('[BaseQuery] Token refresh error:', err);
        return null;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
};

const refreshAccessToken = async (
  api: Parameters<BaseQueryFn>[1],
  extraOptions: Parameters<BaseQueryFn>[2]
): Promise<string | null> => {
  return executeTokenRefresh();
};

const shouldAttemptRefresh = (state: RootState, args: RetryableArgs): boolean => {
  if (!state.auth.hasHydratedAuth || !state.auth.user) {
    return false;
  }

  if (args._retry || AUTH_EXCLUDED_PATHS.has(args.url)) {
    return false;
  }

  return true;
};

const handleStructuredErrors = (
  result: BaseQueryResult
): BaseQueryResult => {
  if (navigator.onLine === false) {
    return {
      error: {
        status: 'CUSTOM_ERROR',
        error: 'offline',
        data: { message: 'You appear to be offline.' },
      } satisfies ErrorWithMessage,
    };
  }

  return result;
};

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  const normalizedArgs = normalizeArgs(args);
  let result = await executeWithRetry(normalizedArgs, api, extraOptions);

  if (result.error?.status === 401) {
    const state = api.getState() as RootState;

    if (shouldAttemptRefresh(state, normalizedArgs)) {
      console.debug(`[BaseQuery] 401 received for ${normalizedArgs.url}, attempting token refresh...`);
      const refreshedToken = await refreshAccessToken(api, extraOptions);

      if (refreshedToken) {
        console.debug(`[BaseQuery] Token refreshed successfully, retrying ${normalizedArgs.url}`);
        result = await executeWithRetry(
          { ...normalizedArgs, _retry: true },
          api,
          extraOptions
        );
      } else {
        console.warn(`[BaseQuery] Token refresh failed for ${normalizedArgs.url}, logging out`);
        api.dispatch(logout({ reason: 'Your session expired. Please sign in again.' }));
      }
    } else {
      console.debug(`[BaseQuery] 401 for ${normalizedArgs.url}, refresh skipped (hasHydratedAuth=${state.auth.hasHydratedAuth}, user=${!!state.auth.user}, retry=${normalizedArgs._retry}, excluded=${AUTH_EXCLUDED_PATHS.has(normalizedArgs.url)})`);
    }
  }

  return handleStructuredErrors(result);
};

export const baseApi = createApi({
  baseQuery: baseQueryWithReauth,
  refetchOnFocus: true,
  refetchOnReconnect: true,
  tagTypes: ['Chat', 'User', 'Contact', 'Status', 'Call', 'Message', 'GifFavorite', 'GifRecent'],
  endpoints: () => ({}),
});
