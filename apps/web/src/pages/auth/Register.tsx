import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Input } from '@zira/ui';
import { useSendOtpMutation, useVerifyOtpMutation, useRegisterMutation } from '@/store/api/authApi';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Shield, UserPlus } from 'lucide-react';

const detailsSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Full Name must be at least 2 characters')
    .max(50, 'Full Name cannot exceed 50 characters'),
  username: z
    .string()
    .min(5, 'Username must be at least 5 characters')
    .max(20, 'Username cannot exceed 20 characters')
    .regex(/^[A-Za-z0-9_]+$/, 'Username can only contain letters, numbers, and underscore (_)'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Confirm Password must be at least 8 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type DetailsForm = z.infer<typeof detailsSchema>;

const stepInfo = [
  { num: 1, label: 'Email' },
  { num: 2, label: 'Verify' },
  { num: 3, label: 'Details' },
];

export const Register = () => {
  const navigate = useNavigate();

  // Step state: 'email' | 'otp' | 'details'
  const [step, setStep] = useState<'email' | 'otp' | 'details'>('email');

  // Registration data state
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');

  // Timer and loading states
  const [timer, setTimer] = useState(0);

  // Mutations
  const [sendOtp, { isLoading: isSendingOtp }] = useSendOtpMutation();
  const [verifyOtp, { isLoading: isVerifyingOtp }] = useVerifyOtpMutation();
  const [registerUser, { isLoading: isRegistering }] = useRegisterMutation();

  // Details form hook
  const { register: registerDetails, handleSubmit: handleDetailsSubmit, formState: { errors: detailsErrors } } = useForm<DetailsForm>({
    resolver: zodResolver(detailsSchema),
  });

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

  const currentStepIndex = step === 'email' ? 0 : step === 'otp' ? 1 : 2;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      const response = await sendOtp({ email: trimmedEmail }).unwrap();
      if (response.success) {
        setStep('otp');
        setTimer(60);
        toast.success('Verification code sent successfully!');
      }
    } catch (err: any) {
      toast.error(err.data?.error || 'Failed to send verification code');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 6) {
      toast.error('Please enter the 6-digit verification code');
      return;
    }

    try {
      const response = await verifyOtp({ email: email.trim(), otp: otpCode }).unwrap();
      if (response.success) {
        setStep('details');
        toast.success('Email verified successfully!');
      }
    } catch (err: any) {
      toast.error(err.data?.error || 'Invalid verification code');
    }
  };

  const onDetailsSubmit = async (data: DetailsForm) => {
    try {
      const response = await registerUser({
        email: email.trim(),
        otp: otpCode,
        fullName: data.fullName,
        username: data.username,
        password: data.password,
        confirmPassword: data.confirmPassword,
      }).unwrap();

      if (response.success) {
        toast.success('Account created successfully!');
        navigate('/login');
      }
    } catch (err: any) {
      toast.error(err.data?.error || 'Failed to register');
    }
  };

  const stepVariants = {
    enter: { opacity: 0, x: 20 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-display font-bold text-text-primary mb-1">Create Account</h3>
        <p className="text-sm text-text-secondary">
          {step === 'email' && 'Enter your email address to get started'}
          {step === 'otp' && 'Enter the verification code'}
          {step === 'details' && 'Fill in your account details'}
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2 py-2">
        {stepInfo.map((s, idx) => (
          <React.Fragment key={s.num}>
            <div className="flex items-center gap-1.5">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                idx <= currentStepIndex 
                  ? 'bg-primary-500 text-white shadow-sm' 
                  : 'bg-surface-hover text-text-muted border border-border'
              }`}>
                {idx < currentStepIndex ? '✓' : s.num}
              </div>
              <span className={`text-xs font-medium hidden xs:inline ${
                idx <= currentStepIndex ? 'text-primary-500' : 'text-text-muted'
              }`}>{s.label}</span>
            </div>
            {idx < stepInfo.length - 1 && (
              <div className={`w-8 h-0.5 rounded transition-colors duration-300 ${
                idx < currentStepIndex ? 'bg-primary-500' : 'bg-border'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 'email' && (
          <motion.form
            key="email"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25 }}
            className="space-y-5"
            onSubmit={handleSendOtp}
          >
            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />

            <Button
              type="submit"
              className="w-full mt-2"
              isLoading={isSendingOtp}
              disabled={isSendingOtp}
            >
              <Mail className="w-4 h-4" />
              Send Verification Code
            </Button>
          </motion.form>
        )}

        {step === 'otp' && (
          <motion.form
            key="otp"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25 }}
            className="space-y-5"
            onSubmit={handleVerifyOtp}
          >
            <div className="text-center bg-primary-500/5 p-4 rounded-xl border border-primary-500/10">
              <p className="text-sm text-text-secondary">
                Verification code has been sent to
              </p>
              <p className="text-sm font-semibold text-primary-500 mt-1 truncate">
                {email}
              </p>
            </div>

            <Input
              label="Enter 6-Digit OTP"
              type="text"
              maxLength={6}
              placeholder="000000"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              required
              autoFocus
            />

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => setStep('email')}
                className="text-text-secondary hover:text-text-primary font-medium transition-colors"
              >
                Change Email
              </button>

              {timer > 0 ? (
                <span className="text-text-muted">Resend in {timer}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  className="text-primary-500 hover:text-primary-600 font-semibold transition-colors"
                >
                  Resend OTP
                </button>
              )}
            </div>

            <Button
              type="submit"
              className="w-full mt-2"
              isLoading={isVerifyingOtp}
              disabled={isVerifyingOtp}
            >
              <Shield className="w-4 h-4" />
              Verify OTP
            </Button>
          </motion.form>
        )}

        {step === 'details' && (
          <motion.form
            key="details"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25 }}
            className="space-y-5"
            onSubmit={handleDetailsSubmit(onDetailsSubmit)}
          >
            <Input
              label="Email Address"
              type="text"
              value={email}
              disabled
              readOnly
            />

            <Input
              label="Full Name"
              placeholder="John Anderson"
              {...registerDetails('fullName')}
              error={detailsErrors.fullName?.message}
              autoFocus
            />

            <Input
              label="Username"
              placeholder="john123"
              {...registerDetails('username')}
              error={detailsErrors.username?.message}
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              {...registerDetails('password')}
              error={detailsErrors.password?.message}
            />

            <Input
              label="Confirm Password"
              type="password"
              placeholder="••••••••"
              {...registerDetails('confirmPassword')}
              error={detailsErrors.confirmPassword?.message}
            />

            <Button type="submit" className="w-full mt-2" isLoading={isRegistering}>
              <UserPlus className="w-4 h-4" />
              Create Account
            </Button>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="text-sm text-center text-text-secondary pt-2">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-primary-500 hover:text-primary-600 transition-colors">
          Sign in
        </Link>
      </div>
    </div>
  );
};