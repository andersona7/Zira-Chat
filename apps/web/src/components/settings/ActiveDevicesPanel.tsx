import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Monitor, Smartphone, Tablet, ShieldCheck, Trash2, Edit3, X, HelpCircle, MapPin, Key } from 'lucide-react';
import { IconButton, Button, Dialog, Input } from '@zira/ui';
import {
  useGetActiveSessionsQuery,
  useRevokeSessionMutation,
  useRevokeAllSessionsMutation,
  useTrustDeviceMutation,
  useUntrustDeviceMutation,
  useRenameDeviceMutation,
} from '@/store/api/authApi';
import toast from 'react-hot-toast';

interface ActiveDevicesPanelProps {
  isOpen: boolean;
  onBack: () => void;
}

export const ActiveDevicesPanel: React.FC<ActiveDevicesPanelProps> = ({ isOpen, onBack }) => {
  const { data: response, isLoading } = useGetActiveSessionsQuery(undefined, { skip: !isOpen });
  const [revokeSession, { isLoading: isRevoking }] = useRevokeSessionMutation();
  const [revokeAllSessions, { isLoading: isRevokingAll }] = useRevokeAllSessionsMutation();
  const [trustDevice] = useTrustDeviceMutation();
  const [untrustDevice] = useUntrustDeviceMutation();
  const [renameDevice] = useRenameDeviceMutation();

  const [renameSessionId, setRenameSessionId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [isRevokeAllOpen, setIsRevokeAllOpen] = useState(false);

  const sessions = response?.data || [];
  const currentDevice = sessions.find((s: any) => s.isCurrent);
  const otherDevices = sessions.filter((s: any) => !s.isCurrent);

  const handleRevoke = async (id: string) => {
    try {
      await revokeSession(id).unwrap();
      toast.success('Session revoked successfully');
    } catch (error: any) {
      toast.error(error.data?.error || 'Failed to revoke session');
    }
  };

  const handleRevokeAll = async () => {
    try {
      await revokeAllSessions({ keepCurrent: true }).unwrap();
      toast.success('Other devices logged out successfully');
      setIsRevokeAllOpen(false);
    } catch (error: any) {
      toast.error(error.data?.error || 'Failed to revoke sessions');
    }
  };

  const handleTrustToggle = async (id: string, isTrusted: boolean) => {
    try {
      if (isTrusted) {
        await untrustDevice(id).unwrap();
        toast.success('Device trust removed');
      } else {
        await trustDevice(id).unwrap();
        toast.success('Device marked as trusted');
      }
    } catch (error: any) {
      toast.error(error.data?.error || 'Failed to update trust status');
    }
  };

  const handleRename = async () => {
    if (!renameSessionId || !newName.trim()) return;
    try {
      await renameDevice({ id: renameSessionId, name: newName.trim() }).unwrap();
      toast.success('Device renamed');
      setRenameSessionId(null);
      setNewName('');
    } catch (error: any) {
      toast.error(error.data?.error || 'Failed to rename device');
    }
  };

  const getDeviceIcon = (platform: string) => {
    switch (platform?.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="w-5 h-5" />;
      case 'tablet':
        return <Tablet className="w-5 h-5" />;
      default:
        return <Monitor className="w-5 h-5" />;
    }
  };

  const renderCard = (s: any, isCurrent = false) => {
    return (
      <div key={s.id} className={`flex items-start gap-4 p-4 rounded-xl border transition-colors ${isCurrent ? 'bg-primary-500/5 border-primary-500/25' : 'bg-surface border-border hover:border-border-hover'}`}>
        <div className={`p-3 rounded-xl ${isCurrent ? 'bg-primary-500/10 text-primary-500' : 'bg-surface-hover text-text-secondary'}`}>
          {getDeviceIcon(s.platform)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-text-primary truncate">{s.deviceName}</h4>
            {isCurrent && <span className="px-2 py-0.5 text-[10px] font-semibold bg-primary-500/15 text-primary-500 rounded-full">Current Device</span>}
            {s.isTrusted && (
              <span title="Trusted Device">
                <ShieldCheck className="w-4 h-4 text-green-500 shrink-0" />
              </span>
            )}
          </div>
          <p className="text-xs text-text-secondary mt-1">
            {s.browser} on {s.os}
          </p>
          <div className="flex items-center gap-4 text-[11px] text-text-muted mt-2">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {s.city ? `${s.city}, ` : ''}{s.country}
            </span>
            <span>•</span>
            <span>IP: {s.ipAddress}</span>
          </div>
          <p className="text-[10px] text-text-muted mt-1.5">
            Last active: {new Date(s.lastActivity).toLocaleString()}
          </p>
          
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={() => {
                setRenameSessionId(s.id);
                setNewName(s.deviceName);
              }}
              className="flex items-center gap-1 text-[11px] font-medium text-primary-500 hover:text-primary-600 transition-colors"
            >
              <Edit3 className="w-3 h-3" /> Rename
            </button>
            <button
              onClick={() => handleTrustToggle(s.id, s.isTrusted)}
              className={`flex items-center gap-1 text-[11px] font-medium transition-colors ${s.isTrusted ? 'text-text-secondary hover:text-text-primary' : 'text-green-500 hover:text-green-600'}`}
            >
              <ShieldCheck className="w-3 h-3" /> {s.isTrusted ? 'Untrust Device' : 'Trust Device'}
            </button>
            {!isCurrent && (
              <button
                onClick={() => handleRevoke(s.id)}
                disabled={isRevoking}
                className="flex items-center gap-1 text-[11px] font-medium text-error hover:text-error-hover transition-colors ml-auto"
              >
                <Trash2 className="w-3 h-3" /> Logout Device
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
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
                <h2 className="text-xl font-medium">Active Devices</h2>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
              {isLoading ? (
                <div className="text-center text-text-secondary text-sm py-8">Loading sessions...</div>
              ) : (
                <>
                  {/* Current Device */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-primary-500 uppercase tracking-wider">Current Device</h3>
                    {currentDevice ? renderCard(currentDevice, true) : <p className="text-sm text-text-secondary">No current device info</p>}
                  </div>

                  {/* Other Devices */}
                  <div className="space-y-3 pt-4 border-t border-border">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Other Active Devices</h3>
                      {otherDevices.length > 0 && (
                        <Button
                          variant="ghost"
                          className="text-error hover:bg-error/5 text-xs h-8 px-3 rounded-lg"
                          onClick={() => setIsRevokeAllOpen(true)}
                        >
                          Logout All Others
                        </Button>
                      )}
                    </div>
                    {otherDevices.length > 0 ? (
                      <div className="space-y-3">
                        {otherDevices.map(d => renderCard(d, false))}
                      </div>
                    ) : (
                      <div className="p-6 rounded-xl border border-dashed border-border text-center text-text-secondary text-sm">
                        No other active devices. You are logged in only on this browser.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rename Dialog */}
      <Dialog
        isOpen={renameSessionId !== null}
        onClose={() => {
          setRenameSessionId(null);
          setNewName('');
        }}
        title="Rename Device"
      >
        <div className="space-y-4 pt-2">
          <Input
            label="Device Custom Name"
            placeholder="e.g. My Office Macbook"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setRenameSessionId(null)}>Cancel</Button>
            <Button onClick={handleRename}>Save Name</Button>
          </div>
        </div>
      </Dialog>

      {/* Revoke All Dialog */}
      <Dialog
        isOpen={isRevokeAllOpen}
        onClose={() => setIsRevokeAllOpen(false)}
        title="Logout other devices?"
      >
        <div className="space-y-4 pt-2">
          <p className="text-text-secondary text-sm">
            Are you sure you want to end all other active sessions? You will stay signed in on this current browser tab, but all other browsers, computers, and phone app instances will be immediately disconnected.
          </p>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setIsRevokeAllOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleRevokeAll} isLoading={isRevokingAll}>Logout All Other Devices</Button>
          </div>
        </div>
      </Dialog>
    </>
  );
};
