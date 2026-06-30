import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Button } from '@zira/ui';
import { useConfirmDeleteAccountMutation } from '@/store/api/userApi';
import { logout } from '@/store/slices/authSlice';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { AlertTriangle, Trash2, CheckCircle2, ShieldAlert } from 'lucide-react';

export const ConfirmDelete = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [confirmDelete, { isLoading }] = useConfirmDeleteAccountMutation();
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error('Invalid page request: Missing token');
      navigate('/login');
    }
  }, [token, navigate]);

  const handleClearClientData = async () => {
    // 1. Clear Local & Session Storage
    localStorage.clear();
    sessionStorage.clear();

    // 2. Clear All Cookies
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i];
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    }

    // 3. Clear IndexedDB Databases
    try {
      if (window.indexedDB && window.indexedDB.databases) {
        const dbs = await window.indexedDB.databases();
        for (const db of dbs) {
          if (db.name) {
            window.indexedDB.deleteDatabase(db.name);
          }
        }
      }
    } catch (err) {
      console.error('Error clearing IndexedDB databases:', err);
    }

    // 4. Clear Cache Storage (Service Worker Cache)
    try {
      if ('caches' in window) {
        const cacheKeys = await window.caches.keys();
        for (const key of cacheKeys) {
          await window.caches.delete(key);
        }
      }
    } catch (err) {
      console.error('Error clearing Cache Storage:', err);
    }

    // 5. Unregister Service Workers
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      }
    } catch (err) {
      console.error('Error unregistering service workers:', err);
    }

    // 6. Reset Redux store
    dispatch(logout());
  };

  const handleConfirmDeletion = async () => {
    if (!token) return;
    if (!isConfirmed) {
      toast.error('Please check the confirmation box to proceed');
      return;
    }

    try {
      const res = await confirmDelete({ token }).unwrap();
      if (res.success) {
        toast.success('Your account has been deleted successfully');
        setSuccess(true);
        // Clear all client side caches
        await handleClearClientData();
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (err: any) {
      toast.error(err.data?.error || 'Failed to delete account. The token may be expired or invalid.');
    }
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-6"
      >
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center text-success">
            <CheckCircle2 className="w-10 h-10" />
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-text-primary font-display">Account Deleted</h3>
          <p className="text-text-secondary text-sm">
            All user data, chats, media files, and active sessions have been wiped from our systems.
          </p>
        </div>
        <p className="text-xs text-primary-500 font-medium">Redirecting you to the login page shortly...</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-1">
          <div className="w-12 h-12 bg-error/10 rounded-full flex items-center justify-center text-error">
            <ShieldAlert className="w-7 h-7" />
          </div>
        </div>
        <h3 className="text-2xl font-display font-bold text-text-primary">Confirm Deletion</h3>
        <p className="text-sm text-text-secondary">Permanently delete your Zira Chat account</p>
      </div>

      <div className="bg-error/5 border border-error/20 rounded-xl p-4 space-y-3">
        <div className="flex gap-3 text-error">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm">This action is permanent and irreversible!</h4>
            <p className="text-xs mt-1 text-text-secondary">
              By confirming, the following data will be permanently wiped from MongoDB and Cloudinary:
            </p>
          </div>
        </div>

        <ul className="text-xs text-text-secondary list-disc pl-9 space-y-1">
          <li>Your profile settings and details</li>
          <li>All conversation history (direct and groups)</li>
          <li>All uploaded media (images, videos, audio, and documents)</li>
          <li>Your contacts list, call logs, and block lists</li>
          <li>Your messages, starred items, and reactions</li>
        </ul>
      </div>

      <div className="space-y-4">
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isConfirmed}
            onChange={(e) => setIsConfirmed(e.target.checked)}
            className="mt-1 w-4 h-4 rounded border-border text-error focus:ring-error focus:ring-offset-background"
          />
          <span className="text-xs text-text-secondary leading-tight">
            I understand that deleting my account is irreversible and that all my data will be permanently lost.
          </span>
        </label>

        <Button
          onClick={handleConfirmDeletion}
          className="w-full bg-error hover:bg-error-dark text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2"
          isLoading={isLoading}
        >
          <Trash2 className="w-4 h-4" />
          Delete Account Permanently
        </Button>

        <div className="text-center">
          <button
            onClick={() => navigate('/login')}
            className="text-xs text-text-secondary hover:text-text-primary transition-colors font-medium"
          >
            Cancel and Return to Login
          </button>
        </div>
      </div>
    </motion.div>
  );
};
