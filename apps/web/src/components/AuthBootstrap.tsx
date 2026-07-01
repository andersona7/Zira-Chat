import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Loader } from './ui/Loader';
import type { AppDispatch, RootState } from '@/store';
import { logout, markAuthHydrated, setAuthLoading, setCredentials } from '@/store/slices/authSlice';

interface RefreshResponse {
  success: boolean;
  data?: {
    accessToken: string;
  };
}

interface MeResponse {
  success: boolean;
  data?: RootState['auth']['user'];
}

export const AuthBootstrap = ({ children }: { children: React.ReactNode }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { hasHydratedAuth, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [isSplashDone, setIsSplashDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSplashDone(true);
    }, 2000); // Enforce premium splash screen duration of 2.0s

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const bootstrapAuth = async () => {
      dispatch(setAuthLoading());

      try {
        if (!isAuthenticated) {
          if (!cancelled) {
            dispatch(markAuthHydrated());
          }
          return;
        }

        const { executeTokenRefresh } = await import('@/store/api/baseQuery');
        const accessToken = await executeTokenRefresh();

        if (!accessToken) {
          throw new Error('refresh_failed');
        }

        const meResponse = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/v1/users/me`, {
          credentials: 'include',
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
        });

        if (!meResponse.ok) {
          throw new Error('user_load_failed');
        }

        const mePayload = (await meResponse.json()) as MeResponse;

        if (!mePayload.data) {
          throw new Error('missing_user');
        }

        if (!cancelled) {
          dispatch(setCredentials({ user: mePayload.data, accessToken }));
        }
      } catch {
        if (!cancelled) {
          dispatch(logout());
        }
      } finally {
        if (!cancelled) {
          dispatch(markAuthHydrated());
        }
      }
    };

    if (!hasHydratedAuth) {
      void bootstrapAuth();
    }

    return () => {
      cancelled = true;
    };
  }, [dispatch, hasHydratedAuth, isAuthenticated]);

  if (!hasHydratedAuth || !isSplashDone) {
    return <Loader />;
  }

  return <>{children}</>;
};
