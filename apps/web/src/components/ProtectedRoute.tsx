import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { Loader } from './ui/Loader';

export const ProtectedRoute = () => {
  const { isAuthenticated, hasHydratedAuth, status } = useSelector((state: RootState) => state.auth);

  if (!hasHydratedAuth || status === 'loading') {
    return <Loader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
