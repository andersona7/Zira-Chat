import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AuthLayout } from './layouts/AuthLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Loader } from './components/ui/Loader';

// Lazy loading major routes to optimize main bundle size
const Login = lazy(() => import('./pages/auth/Login').then(m => ({ default: m.Login })));
const Register = lazy(() => import('./pages/auth/Register').then(m => ({ default: m.Register })));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword').then(m => ({ default: m.ResetPassword })));
const ConfirmDelete = lazy(() => import('./pages/auth/ConfirmDelete').then(m => ({ default: m.ConfirmDelete })));
const Home = lazy(() => import('./pages/Home').then(m => ({ default: m.Home })));

const withSuspense = (Component: React.ComponentType) => (
  <Suspense fallback={<Loader />}>
    <Component />
  </Suspense>
);

export const router = createBrowserRouter(
  [
    {
      element: <AuthLayout />,
      children: [
        { path: '/login', element: withSuspense(Login) },
        { path: '/register', element: withSuspense(Register) },
        { path: '/forgot-password', element: withSuspense(ForgotPassword) },
        { path: '/reset-password', element: withSuspense(ResetPassword) },
        { path: '/confirm-delete', element: withSuspense(ConfirmDelete) },
      ],
    },
    {
      element: <ProtectedRoute />,
      children: [{ path: '/', element: withSuspense(Home) }],
    },
  ],
  {
    future: {
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_relativeSplatPath: true,
      v7_skipActionErrorRevalidation: true,
    },
  }
);
