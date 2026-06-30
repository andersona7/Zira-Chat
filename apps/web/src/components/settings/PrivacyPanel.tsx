import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Shield, Eye, Image as ImageIcon, CheckCircle2, Lock, Key, ChevronRight } from 'lucide-react';
import { IconButton, Toggle, Dialog, Button, Input } from '@zira/ui';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { useUpdateProfileMutation } from '@/store/api/userApi';
import { useChangeLockPinMutation, useVerifyPasswordForLockResetMutation, useRequestLockPinResetCodeMutation, useVerifyLockResetOtpMutation, useResetLockPinMutation } from '@/store/api/chatApi';
import { setCredentials } from '@/store/slices/authSlice';
import toast from 'react-hot-toast';

interface PrivacyPanelProps {
  isOpen: boolean;
  onBack: () => void;
  onOpenBlocked: () => void;
}

export const PrivacyPanel: React.FC<PrivacyPanelProps> = ({ isOpen, onBack, onOpenBlocked }) => {
  const user = useSelector((state: RootState) => state.auth.user);
  const token = useSelector((state: RootState) => state.auth.token);
  const dispatch = useDispatch();
  const [updateProfile] = useUpdateProfileMutation();

  // Chat Lock PIN Management
  const [changeLockPin] = useChangeLockPinMutation();
  const [verifyPasswordForReset] = useVerifyPasswordForLockResetMutation();
  const [requestResetCode] = useRequestLockPinResetCodeMutation();
  const [verifyResetOtp] = useVerifyLockResetOtpMutation();
  const [resetLockPin] = useResetLockPinMutation();

  const hasLockPin = !!(user as any)?.hasLockPin;
  const [changePinDialog, setChangePinDialog] = useState(false);
  const [changeCurrentPin, setChangeCurrentPin] = useState('');
  const [changeNewPin, setChangeNewPin] = useState('');
  const [changeNewPinConfirm, setChangeNewPinConfirm] = useState('');

  const [forgotPinDialog, setForgotPinDialog] = useState(false);
  const [forgotStep, setForgotStep] = useState<'password' | 'otp' | 'new_pin'>('password');
  const [forgotPassword, setForgotPassword] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPin, setForgotNewPin] = useState('');
  const [forgotNewPinConfirm, setForgotNewPinConfirm] = useState('');

  const handleChangePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (changeNewPin !== changeNewPinConfirm) return toast.error('PINs do not match');
    if (!/^\d{4,8}$/.test(changeNewPin)) return toast.error('PIN must be 4–8 digits');
    try {
      await changeLockPin({ currentPin: changeCurrentPin, newPin: changeNewPin }).unwrap();
      toast.success('Chat Lock PIN updated');
      setChangePinDialog(false);
      setChangeCurrentPin(''); setChangeNewPin(''); setChangeNewPinConfirm('');
    } catch (err: any) {
      toast.error(err.data?.error || 'Failed to change PIN');
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await verifyPasswordForReset({ password: forgotPassword }).unwrap();
      await requestResetCode().unwrap();
      toast.success('Verification code sent to your email');
      setForgotStep('otp');
    } catch (err: any) {
      toast.error(err.data?.error || 'Verification failed');
    }
  };

  const handleForgotOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await verifyResetOtp({ otp: forgotOtp }).unwrap();
      setForgotStep('new_pin');
    } catch (err: any) {
      toast.error(err.data?.error || 'Invalid code');
    }
  };

  const handleForgotNewPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotNewPin !== forgotNewPinConfirm) return toast.error('PINs do not match');
    try {
      await resetLockPin({ newPin: forgotNewPin }).unwrap();
      toast.success('PIN reset successfully');
      setForgotPinDialog(false);
      setForgotStep('password');
      setForgotPassword(''); setForgotOtp(''); setForgotNewPin(''); setForgotNewPinConfirm('');
    } catch (err: any) {
      toast.error(err.data?.error || 'Failed to reset PIN');
    }
  };

  if (!user) return null;

  const handleUpdate = async (field: string, value: any) => {
    try {
      const res = await updateProfile({
        settings: {
          ...user.settings,
          privacy: { ...user.settings.privacy, [field]: value }
        }
      }).unwrap();

      if (res.success && res.data && token) {
        dispatch(setCredentials({ user: res.data, accessToken: token }));
      }
    } catch (err) {
      toast.error('Failed to update privacy settings');
    }
  };

  const renderRadioGroup = (label: string, field: 'lastSeen' | 'profilePhoto', icon: React.ReactNode) => {
    const currentValue = user.settings.privacy[field];
    const options = ['EVERYONE', 'CONTACTS', 'NOBODY'] as const;
    const descriptions = {
      EVERYONE: 'Anyone on Zira Chat',
      CONTACTS: 'Only your saved contacts',
      NOBODY: 'No one'
    };

    return (
      <div className="py-6 border-b border-border">
        <div className="flex items-center gap-4 mb-4">
          <div className="text-text-secondary">{icon}</div>
          <h3 className="text-text-primary font-medium">{label}</h3>
        </div>
        <div className="space-y-3 pl-9">
          {options.map((opt) => (
            <label key={opt} className="flex items-center gap-3 cursor-pointer group">
              <div className="relative flex items-center justify-center w-5 h-5 rounded-full border-2 border-primary-600">
                {currentValue === opt && <div className="w-2.5 h-2.5 rounded-full bg-primary-500" />}
              </div>
              <div>
                <p className="text-text-primary text-sm">{opt.charAt(0) + opt.slice(1).toLowerCase()}</p>
                <p className="text-text-secondary text-xs">{descriptions[opt]}</p>
              </div>
              <input 
                type="radio" 
                name={field} 
                value={opt} 
                className="hidden" 
                checked={currentValue === opt}
                onChange={() => handleUpdate(field, opt)}
              />
            </label>
          ))}
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="privacy-panel"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="absolute inset-0 z-[60] flex flex-col bg-background border-r border-border"
        >
          <div className="flex items-end h-[108px] bg-surface px-4 pb-4 shrink-0 border-b border-border">
            <div className="flex items-center gap-6 w-full text-text-primary">
              <IconButton label="Back" onClick={onBack}>
                <ArrowLeft className="w-6 h-6" />
              </IconButton>
              <h2 className="text-xl font-medium">Privacy</h2>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            <p className="text-sm text-text-secondary mb-6 leading-relaxed">
              Control who can see your personal information. If you hide your Last Seen or Read Receipts, you won't be able to see others'.
            </p>

            {renderRadioGroup('Last Seen & Online', 'lastSeen', <Eye className="w-5 h-5" />)}
            {renderRadioGroup('Profile Photo', 'profilePhoto', <ImageIcon className="w-5 h-5" />)}

            <div className="py-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-4">
                <CheckCircle2 className="w-5 h-5 text-text-secondary" />
                <div>
                  <p className="text-text-primary font-medium">Read Receipts</p>
                  <p className="text-xs text-text-secondary mt-0.5 max-w-[200px]">If turned off, you won't send or receive read receipts.</p>
                </div>
              </div>
              <Toggle 
                enabled={user.settings.privacy.readReceipts} 
                onChange={(val) => handleUpdate('readReceipts', val)} 
              />
            </div>

            <div className="py-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Lock className="w-5 h-5 text-text-secondary" />
                <div>
                  <p className="text-text-primary font-medium">Chat Auto-Lock</p>
                  <p className="text-xs text-text-secondary mt-0.5 max-w-[200px]">Automatically re-lock chats after a period of inactivity.</p>
                </div>
              </div>
              <select
                value={localStorage.getItem('chat_lock_timeout') || '5'}
                onChange={(e) => {
                  localStorage.setItem('chat_lock_timeout', e.target.value);
                  window.dispatchEvent(new Event('storage'));
                  toast.success(`Auto-lock set to ${e.target.value} minutes`);
                }}
                className="bg-surface border border-border text-text-primary rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              >
                <option value="1">1 Minute</option>
                <option value="5">5 Minutes</option>
                <option value="15">15 Minutes</option>
                <option value="30">30 Minutes</option>
              </select>
            </div>

            <button 
              onClick={onOpenBlocked}
              className="w-full py-6 flex items-center gap-4 group"
            >
              <Shield className="w-5 h-5 text-text-secondary group-hover:text-error transition-colors" />
              <div className="flex-1 text-left">
                <p className="text-text-primary font-medium group-hover:text-error transition-colors">Blocked Users</p>
                <p className="text-xs text-text-secondary mt-0.5">{user.blockedUsers?.length || 0} contacts blocked</p>
              </div>
            </button>

            {/* Chat Lock PIN Management */}
            <div className="py-6 border-t border-border">
              <div className="flex items-center gap-4 mb-4">
                <Key className="w-5 h-5 text-text-secondary" />
                <div>
                  <p className="text-text-primary font-medium">Chat Lock PIN</p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {hasLockPin ? 'Manage your account-level Chat Lock PIN.' : 'No PIN set. Lock individual chats to set one.'}
                  </p>
                </div>
              </div>
              {hasLockPin && (
                <div className="space-y-2 pl-9">
                  <button
                    onClick={() => setChangePinDialog(true)}
                    className="w-full flex items-center justify-between p-3 hover:bg-surface-hover rounded-xl transition-colors text-left"
                  >
                    <span className="text-sm text-text-primary font-medium">Change PIN</span>
                    <ChevronRight className="w-4 h-4 text-text-muted" />
                  </button>
                  <button
                    onClick={() => { setForgotStep('password'); setForgotPinDialog(true); }}
                    className="w-full flex items-center justify-between p-3 hover:bg-surface-hover rounded-xl transition-colors text-left"
                  >
                    <span className="text-sm text-text-primary font-medium">Forgot PIN / Reset</span>
                    <ChevronRight className="w-4 h-4 text-text-muted" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Change PIN Dialog ── */}
      <Dialog key="privacy-change-pin-dialog" isOpen={changePinDialog} onClose={() => setChangePinDialog(false)} title="Change Chat Lock PIN" className="max-w-sm">
        <form onSubmit={handleChangePinSubmit} className="space-y-4">
          <Input type="password" inputMode="numeric" maxLength={8} value={changeCurrentPin} onChange={(e) => setChangeCurrentPin(e.target.value.replace(/\D/g, ''))} placeholder="Current PIN" className="text-center font-mono tracking-widest" autoFocus />
          <Input type="password" inputMode="numeric" maxLength={8} value={changeNewPin} onChange={(e) => setChangeNewPin(e.target.value.replace(/\D/g, ''))} placeholder="New PIN (4–8 digits)" className="text-center font-mono tracking-widest" />
          <Input type="password" inputMode="numeric" maxLength={8} value={changeNewPinConfirm} onChange={(e) => setChangeNewPinConfirm(e.target.value.replace(/\D/g, ''))} placeholder="Confirm new PIN" className="text-center font-mono tracking-widest" />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setChangePinDialog(false)}>Cancel</Button>
            <Button type="submit" disabled={changeCurrentPin.length < 4 || changeNewPin.length < 4}>Save PIN</Button>
          </div>
        </form>
      </Dialog>

      {/* ── Forgot / Reset PIN Dialog ── */}
      <Dialog
        key={`privacy-forgot-pin-${forgotStep}`}
        isOpen={forgotPinDialog}
        onClose={() => { setForgotPinDialog(false); setForgotStep('password'); }}
        title={forgotStep === 'password' ? 'Verify Identity' : forgotStep === 'otp' ? 'Enter Code' : 'New PIN'}
        className="max-w-sm"
      >
        {forgotStep === 'password' && (
          <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
            <p className="text-sm text-text-secondary">Enter your account password to reset your Chat Lock PIN.</p>
            <Input type="password" value={forgotPassword} onChange={(e) => setForgotPassword(e.target.value)} placeholder="Account password" autoFocus />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" type="button" onClick={() => setForgotPinDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={!forgotPassword}>Send Code</Button>
            </div>
          </form>
        )}
        {forgotStep === 'otp' && (
          <form onSubmit={handleForgotOtpSubmit} className="space-y-4">
            <p className="text-sm text-text-secondary">A 6-digit code was sent to your registered email.</p>
            <Input type="text" inputMode="numeric" maxLength={6} value={forgotOtp} onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))} placeholder="6-digit code" className="text-center font-mono tracking-widest" autoFocus />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" type="button" onClick={() => setForgotStep('password')}>Back</Button>
              <Button type="submit" disabled={forgotOtp.length !== 6}>Verify</Button>
            </div>
          </form>
        )}
        {forgotStep === 'new_pin' && (
          <form onSubmit={handleForgotNewPinSubmit} className="space-y-4">
            <Input type="password" inputMode="numeric" maxLength={8} value={forgotNewPin} onChange={(e) => setForgotNewPin(e.target.value.replace(/\D/g, ''))} placeholder="New PIN (4–8 digits)" className="text-center font-mono tracking-widest" autoFocus />
            <Input type="password" inputMode="numeric" maxLength={8} value={forgotNewPinConfirm} onChange={(e) => setForgotNewPinConfirm(e.target.value.replace(/\D/g, ''))} placeholder="Confirm new PIN" className="text-center font-mono tracking-widest" />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" type="button" onClick={() => setForgotStep('otp')}>Back</Button>
              <Button type="submit" disabled={forgotNewPin.length < 4}>Reset PIN</Button>
            </div>
          </form>
        )}
      </Dialog>
    </AnimatePresence>
  );
};
