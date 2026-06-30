import React from 'react';
import { ArrowLeft, Check, CheckCheck, Clock } from 'lucide-react';
import { IconButton } from '@zira/ui';
import type { Message } from '@zira/types';
import { formatMessageInfoTimestamp } from '@/utils/formatTimestamp';
import { useGetMessageInfoQuery } from '@/store/api/chatApi';

interface MessageInfoPanelProps {
  onClose: () => void;
  message: Message;
  getContactName: (senderId: string) => string;
}

export const MessageInfoPanel: React.FC<MessageInfoPanelProps> = ({
  onClose,
  message,
  getContactName,
}) => {
  const { data: response, isLoading } = useGetMessageInfoQuery({
    chatId: message.chatId,
    messageId: message.id,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-surface border-l border-border w-full items-center justify-center p-6 text-text-secondary">
        <div className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mb-2" />
        <span className="text-sm">Loading message details...</span>
      </div>
    );
  }

  const info = response?.data || message;
  const isGroup = info.chatType === 'GROUP';
  const participants = info.participants || [];

  return (
    <div className="flex flex-col h-full bg-surface border-l border-border w-full">
      {/* Header */}
      <header className="flex items-center gap-4 px-4 py-3 bg-surface/80 glass border-b border-border h-[60px] shrink-0">
        <IconButton label="Close panel" onClick={onClose}>
          <ArrowLeft className="w-5 h-5" />
        </IconButton>
        <h2 className="text-lg font-semibold text-text-primary">Message Info</h2>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
        {/* Message Bubble Preview */}
        <div className="p-4 bg-background border border-border rounded-2xl">
          <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider block mb-2">
            Message Preview
          </span>
          <div className="text-sm text-text-primary leading-relaxed break-words">
            {info.type === 'TEXT' ? info.content : `[${info.type} file]`}
          </div>
          <div className="text-[10px] text-text-muted mt-2 text-right">
            {formatMessageInfoTimestamp(info.createdAt)}
          </div>
        </div>

        {isGroup ? (
          /* Group Receipts screen */
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Read By
            </h3>
            <div className="space-y-3 bg-background/50 rounded-2xl p-4 border border-border/50">
              {participants.length === 0 ? (
                <div className="text-xs text-text-muted text-center py-2">No other participants</div>
              ) : (
                participants.map((p: any) => {
                  const isRead = p.status === 'READ';
                  const isDelivered = p.status === 'DELIVERED' || p.status === 'READ';
                  
                  return (
                    <div key={p.id} className="flex justify-between items-center py-1">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-text-primary">{p.fullName}</span>
                        <span className="text-xs text-text-muted mt-0.5">
                          {isRead ? 'Read' : isDelivered ? 'Delivered' : 'Sent'}
                        </span>
                      </div>
                      <span className="text-xs text-text-muted">
                        {isRead && p.seenAt ? (
                          formatMessageInfoTimestamp(p.seenAt)
                        ) : isDelivered && p.deliveredAt ? (
                          formatMessageInfoTimestamp(p.deliveredAt)
                        ) : isDelivered ? (
                          'Delivered'
                        ) : (
                          'Sent'
                        )}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          /* Direct Message Status Receipts */
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Status
            </h3>

            <div className="space-y-3 bg-background/50 rounded-2xl p-4 border border-border/50">
              {/* Sent Status */}
              <div className="flex items-start gap-3">
                <div className="p-2 bg-secondary/10 rounded-xl text-text-secondary mt-0.5">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-text-primary">Sent</h4>
                  <span className="text-[10px] text-text-muted block mt-1">
                    {formatMessageInfoTimestamp(info.createdAt)}
                  </span>
                </div>
              </div>

              <div className="h-px bg-border my-2" />

              {/* Delivered Receipt */}
              <div className="flex items-start gap-3">
                <div className="p-2 bg-success/10 rounded-xl text-success mt-0.5">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-text-primary">Delivered</h4>
                  <span className="text-[10px] text-text-muted block mt-1">
                    {info.deliveredAt 
                      ? formatMessageInfoTimestamp(info.deliveredAt)
                      : info.status === 'READ' || info.status === 'DELIVERED' 
                        ? 'Delivered' 
                        : 'Pending...'}
                  </span>
                </div>
              </div>

              <div className="h-px bg-border my-2" />

              {/* Read Receipt */}
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary-500/10 rounded-xl text-primary-500 mt-0.5">
                  <CheckCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-text-primary">Read</h4>
                  <span className="text-[10px] text-text-muted block mt-1">
                    {info.seenAt 
                      ? formatMessageInfoTimestamp(info.seenAt)
                      : info.status === 'READ' 
                        ? 'Read' 
                        : 'Not read yet'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Real Reactions Section */}
        {info.reactions && info.reactions.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Reactions
            </h3>
            <div className="flex flex-wrap gap-2">
              {info.reactions.map((r: { userId: string; emoji: string }) => (
                <div
                  key={`${r.userId}-${r.emoji}`}
                  className="flex items-center gap-2 px-3 py-1.5 bg-background border border-border rounded-full hover:bg-surface-hover transition-colors cursor-pointer select-none"
                  title={`Reacted by: ${getContactName(r.userId)}`}
                >
                  <span className="text-base">{r.emoji}</span>
                  <span className="text-xs font-semibold text-text-primary">{getContactName(r.userId)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
