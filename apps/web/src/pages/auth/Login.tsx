import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Button, Input } from '@zira/ui';
import { useLoginMutation } from '@/store/api/authApi';
import { setCredentials } from '@/store/slices/authSlice';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { LogIn } from 'lucide-react';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { clearForceLogoutReason } from '@/store/slices/authSlice';
import React, { useEffect } from 'react';

type LoginForm = z.infer<typeof loginSchema>;

export const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const forceLogoutReason = useSelector((state: RootState) => state.auth.forceLogoutReason);

  useEffect(() => {
    if (forceLogoutReason) {
      toast.error(forceLogoutReason, { duration: 6000 });
      dispatch(clearForceLogoutReason());
    }
  }, [forceLogoutReason, dispatch]);

  const [login, { isLoading }] = useLoginMutation();

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      const response = await login({
        username: data.username,
        password: data.password,
      }).unwrap();

      if (response.success && response.data) {
        dispatch(setCredentials(response.data));
        navigate('/');
      }
    } catch (err: any) {
      toast.error(err.data?.error || 'Failed to login');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="text-center">
        <h3 className="text-2xl font-display font-bold text-text-primary mb-1">Welcome Back</h3>
        <p className="text-sm text-text-secondary">Sign in to continue to Zira Chat</p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
        <Input
          label="Username"
          placeholder="username_123"
          {...register('username')}
          error={errors.username?.message}
          autoFocus
        />

        <div className="space-y-1">
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            {...register('password')}
            error={errors.password?.message}
          />
          <div className="flex justify-end text-xs pt-1">
            <Link
              to="/forgot-password"
              className="text-primary-500 hover:text-primary-600 font-medium transition-colors"
            >
              Forgot Password?
            </Link>
          </div>
        </div>

        <Button type="submit" className="w-full mt-2" isLoading={isLoading}>
          <LogIn className="w-4 h-4" />
          Sign In
        </Button>
      </form>

      <div className="text-sm text-center text-text-secondary pt-2">
        Don't have an account?{' '}
        <Link to="/register" className="font-semibold text-primary-500 hover:text-primary-600 transition-colors">
          Create one
        </Link>
      </div>
    </motion.div>
  );
};