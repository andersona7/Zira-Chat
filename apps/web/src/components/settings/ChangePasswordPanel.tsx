import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Key } from 'lucide-react';
import { IconButton, Button, Input } from '@zira/ui';
import { useChangePasswordMutation } from '@/store/api/authApi';
import toast from 'react-hot-toast';

interface ChangePasswordPanelProps {
  isOpen: boolean;
  onBack: () => void;
}

export const ChangePasswordPanel: React.FC<ChangePasswordPanelProps> = ({ isOpen, onBack }) => {
  const [changePassword, { isLoading }] = useChangePasswordMutation();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [logoutAll, setLogoutAll] = useState(true);

  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { label: 'Empty', color: 'bg-border', width: 'w-0' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    switch (score) {
      case 1:
      case 2:
        return { label: 'Weak', color: 'bg-error', width: 'w-1/3' };
      case 3:
      case 4:
        return { label: 'Medium', color: 'bg-orange-500', width: 'w-2/3' };
      case 5:
        return { label: 'Strong', color: 'bg-green-500', width: 'w-full' };
      default:
        return { label: 'Weak', color: 'bg-error', width: 'w-1/3' };
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error('All password fields are required');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }

    try {
      const res = await changePassword({
        oldPassword,
        newPassword,
        confirmPassword,
        logoutAll,
      }).unwrap();

      if (res.success) {
        toast.success('Password updated successfully');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        onBack();
      }
    } catch (error: any) {
      toast.error(error.data?.error || 'Failed to change password');
    }
  };

  const strength = getPasswordStrength(newPassword);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="absolute inset-0 z-50 flex flex-col bg-background border-r border-border"
        >
          {/* Header */}
          <div className="flex items-end h-[108px] bg-surface px-4 pb-4 shrink-0 border-b border-border">
            <div className="flex items-center gap-6 w-full text-text-primary">
              <IconButton label="Back" onClick={onBack}>
                <ArrowLeft className="w-6 h-6" />
              </IconButton>
              <h2 className="text-xl font-medium">Change Password</h2>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleUpdate} className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
            <Input
              label="Current Password"
              type="password"
              placeholder="Enter current password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
            />

            <div className="space-y-2">
              <Input
                label="New Password"
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              
              {/* Strength Meter */}
              {newPassword && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-text-secondary">
                    <span>Password Strength:</span>
                    <span className="font-semibold">{strength.label}</span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-hover rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-300 ${strength.color} ${strength.width}`} />
                  </div>
                </div>
              )}
            </div>

            <Input
              label="Confirm New Password"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            {/* Logout Options */}
            <div className="p-4 bg-surface rounded-xl border border-border space-y-3">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={logoutAll}
                  onChange={(e) => setLogoutAll(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-border text-primary-500 focus:ring-primary-500/20"
                />
                <div>
                  <span className="text-sm font-medium text-text-primary">Logout all other devices</span>
                  <p className="text-xs text-text-secondary mt-0.5">Recommended. Revokes all current sessions except this browser session.</p>
                </div>
              </label>
            </div>

            <Button type="submit" className="w-full" isLoading={isLoading}>
              <Key className="w-4 h-4" />
              Update Password
            </Button>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
