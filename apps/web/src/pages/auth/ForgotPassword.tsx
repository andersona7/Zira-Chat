import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Input } from '@zira/ui';
import { useSendForgotPasswordOtpMutation } from '@/store/api/authApi';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { KeyRound } from 'lucide-react';

const forgotPasswordSchema = z.object({
  username: z.string().min(1, 'Username is required'),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export const ForgotPassword = () => {
  const navigate = useNavigate();
  const [sendForgotPasswordOtp, { isLoading }] = useSendForgotPasswordOtpMutation();

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    try {
      const response = await sendForgotPasswordOtp({ username: data.username.trim() }).unwrap();
      if (response.success) {
        toast.success('If the account exists, a reset code was sent to the registered email.');
        // Navigate to reset password page, forwarding username
        navigate('/reset-password', { state: { username: data.username.trim() } });
      }
    } catch (err: any) {
      toast.error(err.data?.error || 'Failed to request password reset');
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
        <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center mx-auto mb-4">
          <KeyRound className="w-6 h-6 text-primary-500" />
        </div>
        <h3 className="text-2xl font-display font-bold text-text-primary mb-1">Forgot Password</h3>
        <p className="text-sm text-text-secondary">
          Enter your username to receive a password reset verification code
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
        <Input
          label="Username"
          placeholder="username_123"
          {...register('username')}
          error={errors.username?.message}
          autoFocus
        />

        <Button type="submit" className="w-full mt-2" isLoading={isLoading}>
          Send Verification Code
        </Button>
      </form>

      <div className="text-sm text-center text-text-secondary pt-2">
        Remember your password?{' '}
        <Link to="/login" className="font-semibold text-primary-500 hover:text-primary-600 transition-colors">
          Sign in
        </Link>
      </div>
    </motion.div>
  );
};
