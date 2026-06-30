import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, AlertTriangle, ShieldCheck, UserCheck, Key, ShieldAlert } from 'lucide-react';
import { IconButton, Button } from '@zira/ui';
import { useGetSecurityLogHistoryQuery } from '@/store/api/authApi';

interface SecurityActivityPanelProps {
  isOpen: boolean;
  onBack: () => void;
}

export const SecurityActivityPanel: React.FC<SecurityActivityPanelProps> = ({ isOpen, onBack }) => {
  const [page, setPage] = useState(1);
  const { data: response, isLoading } = useGetSecurityLogHistoryQuery({ page, limit: 20 }, { skip: !isOpen });

  const logs = response?.data?.logs || [];
  const total = response?.data?.total || 0;

  const getActionColor = (action: string, result: string) => {
    if (result !== 'SUCCESS') return 'bg-error/10 text-error border-error/20';
    switch (action) {
      case 'LOGIN':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'PASSWORD_CHANGE':
        return 'bg-primary-500/10 text-primary-500 border-primary-500/20';
      case 'TOKEN_REUSE':
      case 'SECURITY_REVOCATION':
        return 'bg-error/10 text-error border-error/20';
      default:
        return 'bg-surface-hover text-text-secondary border-border';
    }
  };

  const getActionIcon = (action: string, result: string) => {
    if (result !== 'SUCCESS') return <ShieldAlert className="w-4 h-4" />;
    switch (action) {
      case 'LOGIN':
        return <UserCheck className="w-4 h-4" />;
      case 'PASSWORD_CHANGE':
        return <Key className="w-4 h-4" />;
      case 'TOKEN_REUSE':
        return <ShieldAlert className="w-4 h-4" />;
      default:
        return <ShieldCheck className="w-4 h-4" />;
    }
  };

  const formatActionName = (action: string) => {
    return action?.replace(/_/g, ' ') || 'SECURITY EVENT';
  };

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
              <h2 className="text-xl font-medium">Security Activity</h2>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
            {isLoading ? (
              <div className="text-center text-text-secondary text-sm py-8">Loading history...</div>
            ) : logs.length > 0 ? (
              <div className="relative border-l border-border pl-6 space-y-6 ml-3">
                {logs.map((log: any) => (
                  <div key={log.id} className="relative">
                    {/* Event Dot Icon */}
                    <div className={`absolute -left-[38px] top-1 flex items-center justify-center p-2 rounded-full border bg-background ${getActionColor(log.action, log.result)}`}>
                      {getActionIcon(log.action, log.result)}
                    </div>
                    
                    <div className="bg-surface p-4 rounded-xl border border-border">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-text-primary text-sm uppercase tracking-wider">
                          {formatActionName(log.action)}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${log.result === 'SUCCESS' ? 'bg-green-500/10 text-green-500' : 'bg-error/10 text-error'}`}>
                          {log.result}
                        </span>
                      </div>
                      
                      <p className="text-xs text-text-secondary mt-1">
                        {log.deviceName ? `${log.deviceName} • ` : ''}{log.browser ? `${log.browser} • ` : ''}{log.os}
                      </p>
                      
                      {log.reason && (
                        <p className="text-xs text-text-muted mt-2 italic bg-background/50 p-2 rounded border border-border/50">
                          {log.reason}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-text-muted mt-3">
                        <span>IP: {log.ipAddress} {log.country ? `(${log.country})` : ''}</span>
                        <span>{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-xl border border-dashed border-border text-center text-text-secondary text-sm">
                No security logs recorded.
              </div>
            )}
          </div>

          {/* Pagination */}
          {total > 20 && (
            <div className="flex items-center justify-between p-4 border-t border-border bg-surface">
              <Button
                variant="ghost"
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(p - 1, 1))}
              >
                Previous
              </Button>
              <span className="text-xs text-text-secondary">
                Page {page} of {Math.ceil(total / 20)}
              </span>
              <Button
                variant="ghost"
                disabled={page * 20 >= total}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
