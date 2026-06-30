import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Shield, Key, Laptop, History } from 'lucide-react';
import { IconButton } from '@zira/ui';
import { ActiveDevicesPanel } from './ActiveDevicesPanel';
import { SecurityActivityPanel } from './SecurityActivityPanel';
import { ChangePasswordPanel } from './ChangePasswordPanel';

interface SecurityPanelProps {
  isOpen: boolean;
  onBack: () => void;
}

export const SecurityPanel: React.FC<SecurityPanelProps> = ({ isOpen, onBack }) => {
  const [activeSubView, setActiveSubView] = useState<'MAIN' | 'DEVICES' | 'ACTIVITY' | 'PASSWORD'>('MAIN');

  return (
    <>
      <AnimatePresence>
        {isOpen && activeSubView === 'MAIN' && (
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
                <h2 className="text-xl font-medium flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary-500" />
                  Security & Devices
                </h2>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-2">
              <button
                onClick={() => setActiveSubView('PASSWORD')}
                className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-surface/50 transition-colors text-left group"
              >
                <div className="p-2.5 rounded-xl bg-primary-500/10 text-primary-500">
                  <Key className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="text-text-primary font-medium">Change Password</h4>
                  <p className="text-xs text-text-secondary mt-0.5">Update your password and manage global session revocation</p>
                </div>
              </button>

              <button
                onClick={() => setActiveSubView('DEVICES')}
                className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-surface/50 transition-colors text-left group"
              >
                <div className="p-2.5 rounded-xl bg-green-500/10 text-green-500">
                  <Laptop className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="text-text-primary font-medium">Active Devices</h4>
                  <p className="text-xs text-text-secondary mt-0.5">View and manage your active web, mobile, and desktop logins</p>
                </div>
              </button>

              <button
                onClick={() => setActiveSubView('ACTIVITY')}
                className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-surface/50 transition-colors text-left group"
              >
                <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-500">
                  <History className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="text-text-primary font-medium">Security Activity</h4>
                  <p className="text-xs text-text-secondary mt-0.5">Immutable audit logs of successful/failed logins and security updates</p>
                </div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ActiveDevicesPanel
        isOpen={isOpen && activeSubView === 'DEVICES'}
        onBack={() => setActiveSubView('MAIN')}
      />

      <SecurityActivityPanel
        isOpen={isOpen && activeSubView === 'ACTIVITY'}
        onBack={() => setActiveSubView('MAIN')}
      />

      <ChangePasswordPanel
        isOpen={isOpen && activeSubView === 'PASSWORD'}
        onBack={() => setActiveSubView('MAIN')}
      />
    </>
  );
};
