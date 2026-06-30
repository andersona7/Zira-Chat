import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Button, Input } from '@zira/ui';
import { useResetPasswordMutation, useSendForgotPasswordOtpMutation } from '@/store/api/authApi';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';

const resetPasswordSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  otp: z.string().length(6, 'OTP must be exactly 6 digits'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Confirm password must be at least 8 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export const ResetPassword = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const stateUsername = location.state?.username || '';

  const [timer, setTimer] = useState(0);
  const [resetPassword, { isLoading }] = useResetPasswordMutation();
  const [sendForgotPasswordOtp, { isLoading: isResending }] = useSendForgotPasswordOtpMutation();

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      username: stateUsername,
      otp: '',
      password: '',
      confirmPassword: '',
    },
  });

  // Keep value in sync if location state loads late
  useEffect(() => {
    if (stateUsername) {
      setValue('username', stateUsername);
    }
  }, [stateUsername, setValue]);

  // Countdown timer for Resend OTP
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleResendOtp = async (usernameVal: string) => {
    if (!usernameVal) {
      toast.error('Username is required to resend OTP');
      return;
    }
    try {
      const response = await sendForgotPasswordOtp({ username: usernameVal }).unwrap();
      if (response.success) {
        setTimer(60);
        toast.success('Reset code resent successfully!');
      }
    } catch (err: any) {
      toast.error(err.data?.error || 'Failed to resend reset code');
    }
  };

  const onSubmit = async (data: ResetPasswordForm) => {
    try {
      const response = await resetPassword(data).unwrap();
      if (response.success) {
        toast.success('Password reset successfully! Please sign in.');
        navigate('/login');
      }
    } catch (err: any) {
      toast.error(err.data?.error || 'Failed to reset password');
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
          <ShieldCheck className="w-6 h-6 text-primary-500" />
        </div>
        <h3 className="text-2xl font-display font-bold text-text-primary mb-1">Reset Password</h3>
        <p className="text-sm text-text-secondary">
          Enter the verification code sent to your registered email along with your new password
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
        <Input
          label="Username"
          placeholder="username_123"
          {...register('username')}
          error={errors.username?.message}
          readOnly={!!stateUsername}
        />

        <Input
          label="Verification Code (OTP)"
          type="text"
          maxLength={6}
          placeholder="000000"
          {...register('otp')}
          error={errors.otp?.message}
          autoFocus={!!stateUsername}
        />

        <Input
          label="New Password"
          type="password"
          placeholder="••••••••"
          {...register('password')}
          error={errors.password?.message}
        />

        <Input
          label="Confirm New Password"
          type="password"
          placeholder="••••••••"
          {...register('confirmPassword')}
          error={errors.confirmPassword?.message}
        />

        <div className="flex items-center justify-between text-sm pt-1">
          <Link to="/forgot-password" className="text-text-secondary hover:text-text-primary font-medium transition-colors">
            Request New Code
          </Link>

          {timer > 0 ? (
            <span className="text-text-muted">Resend in {timer}s</span>
          ) : (
            <button
              type="button"
              onClick={() => {
                const element = document.getElementsByName('username')[0] as HTMLInputElement;
                handleResendOtp(element?.value || stateUsername);
              }}
              disabled={isResending}
              className="text-primary-500 hover:text-primary-600 font-semibold transition-colors"
            >
              Resend OTP
            </button>
          )}
        </div>

        <Button type="submit" className="w-full mt-2" isLoading={isLoading}>
          Reset Password
        </Button>
      </form>

      <div className="text-sm text-center text-text-secondary pt-2">
        Back to{' '}
        <Link to="/login" className="font-semibold text-primary-500 hover:text-primary-600 transition-colors">
          Sign In
        </Link>
      </div>
    </motion.div>
  );
};
