import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, store } from '../store';
import { chatApi } from '../store/api/chatApi';
import { getDisplayName } from './useContactNames';
import { statusApi } from '../store/api/statusApi';
import { contactApi } from '../store/api/contactApi';
import { receiveCall, endCall } from '../store/slices/callSlice';
import { setTypingState, setActiveChat } from '../store/slices/chatSlice';
import {
  updateBlockedUsers,
  addBlockedBy,
  removeBlockedBy,
  logout,
} from '../store/slices/authSlice';
import { userApi } from '../store/api/userApi';
import { playNotificationSound } from '../utils/audio';
import toast from 'react-hot-toast';
import type { Message } from '@zira/types';
import { selectActiveChat } from '../store/selectors';
import { executeTokenRefresh } from '../store/api/baseQuery';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

interface SocketContextType {
  socket: Socket | null;
  sendMessage: (
    chatId: string,
    content: string,
    type?: string,
    media?: any,
    replyTo?: string,
    forwarded?: boolean,
    sharedContact?: any,
    gifId?: string,
    clientId?: string
  ) => void;
  emitCallInitiate: (receiverId: string, type: string, offer: RTCSessionDescriptionInit) => void;
  emitCallAccept: (callerId: string, answer: RTCSessionDescriptionInit) => void;
  emitCallReject: (callerId: string) => void;
  emitCallEnd: (targetId: string) => void;
  emitIceCandidate: (targetId: string, candidate: RTCIceCandidateInit) => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [connectedSocket, setConnectedSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const user = useSelector((state: RootState) => state.auth.user);
  const token = useSelector((state: RootState) => state.auth.token);
  const activeChat = useSelector(selectActiveChat);
  const dispatch = useDispatch<any>();

  const activeChatRef = useRef(activeChat);
  const userRef = useRef(user);

  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const isLoggedIn = !!user && !!token;

  useEffect(() => {
    if (socketRef.current && token) {
      socketRef.current.auth = { token };
      if (!socketRef.current.connected) {
        socketRef.current.connect();
      }
    }
  }, [token]);

  useEffect(() => {
    if (!isLoggedIn) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnectedSocket(null);
      }
      return;
    }

    const currentToken = store.getState().auth.token;
    const socket = io(SOCKET_URL, {
      auth: { token: currentToken },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;
    setConnectedSocket(socket);

    // When the socket fails to connect due to auth errors, try refreshing the access token
    socket.on('connect_error', async (err) => {
      if (err.message.includes('Authentication error')) {
        console.warn('[Socket] Auth error on connect, attempting token refresh...');
        try {
          const newToken = await executeTokenRefresh();
          if (newToken) {
            socket.auth = { token: newToken };
            socket.connect();
          } else {
            console.warn('[Socket] Token refresh failed, will be handled by Redux state change');
          }
        } catch (refreshErr) {
          console.warn('[Socket] Token refresh request failed', refreshErr);
        }
      }
    });

    // On each reconnection attempt, ensure the socket uses the latest token from Redux
    socket.io.on('reconnect_attempt', () => {
      const latestToken = (store.getState() as RootState).auth.token;
      if (latestToken) {
        socket.auth = { token: latestToken };
      }
    });

    socket.on('receive_message', (message: Message & { clientId?: string }) => {
      const updateFn = (draft: any) => {
        if (draft && draft.data && draft.data.messages) {
          // If there is an optimistic placeholder with matching clientId, replace it
          const index = draft.data.messages.findIndex(
            (m: any) =>
              (message.clientId &&
                (m.id === message.clientId || m.clientId === message.clientId)) ||
              m.id === message.id
          );
          if (index !== -1) {
            draft.data.messages[index] = { ...message, isOptimistic: false };
          } else {
            draft.data.messages.push(message);
          }
        }
      };
      dispatch(
        chatApi.util.updateQueryData('getMessages', { chatId: message.chatId } as any, updateFn)
      );
      dispatch(
        chatApi.util.updateQueryData(
          'getMessages',
          { chatId: message.chatId, cursor: undefined },
          updateFn
        )
      );
      dispatch(
        chatApi.util.updateQueryData(
          'getMessages',
          { chatId: message.chatId, cursor: null },
          updateFn
        )
      );

      // Inline update for getChats sidebar list
      dispatch(
        chatApi.util.updateQueryData('getChats', undefined, (draft) => {
          if (draft && draft.data) {
            const chat = draft.data.find((c: any) => c.id === message.chatId);
            if (chat) {
              chat.lastMessage = message;
              chat.updatedAt = message.createdAt;

              const currentUser = userRef.current;
              const currentActiveChat = activeChatRef.current;
              const isOwnMessage = currentUser && message.senderId === currentUser.id;
              const isCurrentChat = currentActiveChat?.id === message.chatId;

              if (!isOwnMessage && !isCurrentChat && currentUser) {
                if (!chat.unreadCounts) chat.unreadCounts = {};
                chat.unreadCounts[currentUser.id] = (chat.unreadCounts[currentUser.id] || 0) + 1;
              }

              // Re-sort chats by updatedAt
              draft.data.sort(
                (a: any, b: any) =>
                  new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
              );
            }
          }
        })
      );

      const currentUser = userRef.current;
      const currentActiveChat = activeChatRef.current;

      const isMuted = currentUser?.mutedChats?.includes(message.chatId);
      const isCurrentChat = currentActiveChat?.id === message.chatId;
      const isOwnMessage = currentUser && message.senderId === currentUser.id;

      if (!isOwnMessage && !isCurrentChat && !isMuted && currentUser) {
        if (currentUser.settings?.notifications?.sound) playNotificationSound();
        if (
          currentUser.settings?.notifications?.browser &&
          'Notification' in window &&
          Notification.permission === 'granted'
        ) {
          const chatsResult = chatApi.endpoints.getChats.select()(store.getState() as any);
          const chats = chatsResult?.data?.data || [];
          const chatObj = chats.find((c) => c.id === message.chatId);
          const participant = chatObj?.participants?.find(
            (p) => p.id === message.senderId || (p as any)._id === message.senderId
          );
          const senderName = getDisplayName(message.senderId, participant) || 'New Message';

          const state = store.getState() as RootState;
          const unlockedChats = (state.chat as any).unlockedChats || [];
          const isChatLocked = (chatObj as any)?.isLocked && !unlockedChats.includes(chatObj?.id);

          if (isChatLocked) {
            new Notification('Locked Chat', { body: 'New Message', icon: '/favicon.svg' });
          } else {
            new Notification(senderName, {
              body: message.content || 'New attachment',
              icon: '/favicon.svg',
            });
          }
        }
      }
    });

    socket.on('chat_updated', (data?: { chatId?: string; deleted?: boolean }) => {
      dispatch(chatApi.util.invalidateTags(['Chat']));
      const currentActiveChat = activeChatRef.current;
      if (data?.deleted && currentActiveChat?.id === data.chatId) {
        dispatch(setActiveChat(null));
        toast.error('This group was deleted by the admin');
      }
    });

    socket.on('messages_read', ({ chatId, readBy, seenAt }) => {
      const updateFn = (draft: any) => {
        if (draft && draft.data && draft.data.messages) {
          draft.data.messages.forEach((msg: any) => {
            if (msg.senderId !== readBy) {
              msg.status = 'READ';
              if (seenAt && !msg.seenAt) msg.seenAt = seenAt;
            }
          });
        }
      };
      dispatch(chatApi.util.updateQueryData('getMessages', { chatId } as any, updateFn));
      dispatch(
        chatApi.util.updateQueryData('getMessages', { chatId, cursor: undefined }, updateFn)
      );
      dispatch(chatApi.util.updateQueryData('getMessages', { chatId, cursor: null }, updateFn));

      // Update unread count for readBy in getChats cache
      dispatch(
        chatApi.util.updateQueryData('getChats', undefined, (draft) => {
          if (draft.data) {
            const chat = draft.data.find((c: any) => c.id === chatId);
            if (chat) {
              if (!chat.unreadCounts) chat.unreadCounts = {};
              chat.unreadCounts[readBy] = 0;
            }
          }
        })
      );
    });

    socket.on('message_deleted', ({ messageId, chatId }) => {
      console.log(
        `[Socket] message_deleted received on client. messageId: ${messageId}, chatId: ${chatId}`
      );
      const updateFn = (draft: any) => {
        if (draft && draft.data && draft.data.messages) {
          const msg = draft.data.messages.find((m: any) => m.id === messageId);
          console.log(`[Socket] Finding message in cache for deletion. Found:`, !!msg);
          if (msg) {
            msg.isDeleted = true;
            msg.content = 'This message was deleted';
            msg.media = undefined;
            msg.type = 'TEXT';
            msg.replyTo = undefined;
            msg.forwarded = false;
            msg.isPinned = false;
            msg.starredBy = [];
            msg.reactions = [];
          }
        }
      };
      dispatch(chatApi.util.updateQueryData('getMessages', { chatId } as any, updateFn));
      dispatch(
        chatApi.util.updateQueryData('getMessages', { chatId, cursor: undefined }, updateFn)
      );
      dispatch(chatApi.util.updateQueryData('getMessages', { chatId, cursor: null }, updateFn));
    });

    socket.on('message_media_expired', ({ messageId, chatId }) => {
      const updateFn = (draft: any) => {
        if (draft && draft.data && draft.data.messages) {
          const msg = draft.data.messages.find((m: any) => m.id === messageId);
          if (msg) {
            msg.media = undefined;
          }
        }
      };
      dispatch(chatApi.util.updateQueryData('getMessages', { chatId } as any, updateFn));
      dispatch(
        chatApi.util.updateQueryData('getMessages', { chatId, cursor: undefined }, updateFn)
      );
      dispatch(chatApi.util.updateQueryData('getMessages', { chatId, cursor: null }, updateFn));
    });

    socket.on('message_reacted', ({ messageId, chatId, reactions }) => {
      const updateFn = (draft: any) => {
        if (draft && draft.data && draft.data.messages) {
          const msg = draft.data.messages.find((m: any) => m.id === messageId);
          if (msg) msg.reactions = reactions;
        }
      };
      dispatch(chatApi.util.updateQueryData('getMessages', { chatId } as any, updateFn));
      dispatch(
        chatApi.util.updateQueryData('getMessages', { chatId, cursor: undefined }, updateFn)
      );
      dispatch(chatApi.util.updateQueryData('getMessages', { chatId, cursor: null }, updateFn));
    });

    socket.on('message_pinned', ({ messageId, chatId, isPinned }) => {
      const updateFn = (draft: any) => {
        if (draft && draft.data && draft.data.messages) {
          const msg = draft.data.messages.find((m: any) => m.id === messageId);
          if (msg) msg.isPinned = isPinned;
        }
      };
      dispatch(chatApi.util.updateQueryData('getMessages', { chatId } as any, updateFn));
      dispatch(
        chatApi.util.updateQueryData('getMessages', { chatId, cursor: undefined }, updateFn)
      );
      dispatch(chatApi.util.updateQueryData('getMessages', { chatId, cursor: null }, updateFn));
    });

    socket.on('message_starred', ({ messageId, chatId, starredBy }) => {
      const updateFn = (draft: any) => {
        if (draft && draft.data && draft.data.messages) {
          const msg = draft.data.messages.find((m: any) => m.id === messageId);
          if (msg) msg.starredBy = starredBy;
        }
      };
      dispatch(chatApi.util.updateQueryData('getMessages', { chatId } as any, updateFn));
      dispatch(
        chatApi.util.updateQueryData('getMessages', { chatId, cursor: undefined }, updateFn)
      );
      dispatch(chatApi.util.updateQueryData('getMessages', { chatId, cursor: null }, updateFn));
    });

    socket.on(
      'user_status_change',
      (payload: { userId: string; isOnline: boolean; lastSeen?: string }) => {
        dispatch(
          chatApi.util.updateQueryData('getChats', undefined, (draft) => {
            if (draft && draft.data) {
              draft.data.forEach((chat: any) => {
                chat.participants.forEach((p: any) => {
                  if (p.id === payload.userId || (p._id && p._id === payload.userId)) {
                    p.isOnline = payload.isOnline;
                    p.status = payload.isOnline ? 'ONLINE' : 'OFFLINE';
                    if (payload.lastSeen) {
                      p.lastSeen = payload.lastSeen;
                    }
                  }
                });
              });
            }
          })
        );
      }
    );

    socket.on('message_error', (payload: { chatId: string; error: string }) => {
      toast.error(payload.error);
    });

    socket.on('typing_state', (payload: { chatId: string; userId: string; isTyping: boolean }) => {
      dispatch(setTypingState({ chatId: payload.chatId, isTyping: payload.isTyping }));
    });

    socket.on('status_updated', () => {
      dispatch(statusApi.util.invalidateTags(['Status']));
    });

    socket.on('contact_updated', (contact: any) => {
      dispatch(
        contactApi.util.updateQueryData('getContacts', undefined, (draft) => {
          if (draft.data) {
            const index = draft.data.findIndex((c: any) => c.id === contact.id);
            if (index !== -1) {
              draft.data[index] = contact;
            } else {
              draft.data.unshift(contact);
            }
          }
        })
      );
    });

    socket.on(
      'contact_deleted',
      ({ id, chatId }: { id: string; contactUserId: string; chatId?: string }) => {
        dispatch(
          contactApi.util.updateQueryData('getContacts', undefined, (draft) => {
            if (draft.data) {
              draft.data = draft.data.filter((c: any) => c.id !== id);
              return draft;
            }
          })
        );
        dispatch(chatApi.util.invalidateTags(['Chat']));

        const currentActiveChat = activeChatRef.current;
        if (chatId && currentActiveChat?.id === chatId) {
          dispatch(setActiveChat(null));
        }
      }
    );

    socket.on('chat_cleared', ({ chatId }: { chatId: string }) => {
      dispatch(chatApi.util.invalidateTags(['Message', 'Chat']));
    });

    socket.on(
      'block:sync',
      ({
        blockerId,
        blockedId,
        isBlocked,
      }: {
        blockerId: string;
        blockedId: string;
        isBlocked: boolean;
      }) => {
        const state = store.getState() as RootState;
        const currentBlocked = state.auth.user?.blockedUsers || [];
        if (isBlocked) {
          if (!currentBlocked.includes(blockedId)) {
            dispatch(updateBlockedUsers([...currentBlocked, blockedId]));
          }
        } else {
          dispatch(updateBlockedUsers(currentBlocked.filter((id) => id !== blockedId)));
        }
        dispatch(chatApi.util.invalidateTags(['Chat']));
        dispatch(contactApi.util.invalidateTags(['Contact']));
        dispatch(userApi.util.invalidateTags(['User']));
      }
    );

    socket.on(
      'block:user',
      ({
        blockerId,
        blockedId,
        isBlocked,
      }: {
        blockerId: string;
        blockedId: string;
        isBlocked: boolean;
      }) => {
        dispatch(addBlockedBy(blockerId));
        dispatch(chatApi.util.invalidateTags(['Chat']));
        dispatch(contactApi.util.invalidateTags(['Contact']));
        dispatch(userApi.util.invalidateTags(['User']));
      }
    );

    socket.on(
      'unblock:user',
      ({
        blockerId,
        blockedId,
        isBlocked,
      }: {
        blockerId: string;
        blockedId: string;
        isBlocked: boolean;
      }) => {
        dispatch(removeBlockedBy(blockerId));
        dispatch(chatApi.util.invalidateTags(['Chat']));
        dispatch(contactApi.util.invalidateTags(['Contact']));
        dispatch(userApi.util.invalidateTags(['User']));
      }
    );

    socket.on(
      'conversation:update',
      ({
        chatId,
        isBlocked,
        blockerId,
      }: {
        chatId: string;
        isBlocked: boolean;
        blockerId: string;
      }) => {
        dispatch(chatApi.util.invalidateTags(['Chat', 'Message']));
      }
    );

    // WebRTC Global Listeners
    socket.on('call_incoming', (payload: any) => {
      dispatch(receiveCall(payload));

      const currentUser = userRef.current;
      if (
        currentUser?.settings?.notifications?.browser &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        const callerName =
          getDisplayName(payload.caller?.id || payload.caller?._id, payload.caller) || 'Someone';
        new Notification('Incoming Call', {
          body: `${callerName} is calling you (${payload.type === 'VIDEO' ? 'Video' : 'Voice'} Call)`,
          icon: '/favicon.svg',
          tag: 'call_incoming',
        });
      }
    });

    socket.on('call_rejected', () => {
      dispatch(endCall());
      toast('Call was rejected');
    });

    socket.on('call_ended', () => {
      dispatch(endCall());
    });

    socket.on('session:revoked', (payload?: { reason?: string }) => {
      const reason = payload?.reason || 'Your session has been ended from another device.';
      dispatch(logout({ reason }));
      toast.error(reason, { duration: 6000 });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnectedSocket(null);
    };
  }, [isLoggedIn, dispatch]);

  useEffect(() => {
    if (connectedSocket && activeChat) {
      connectedSocket.emit('join_chat', activeChat.id);
      return () => {
        connectedSocket.emit('leave_chat', activeChat.id);
      };
    }
  }, [connectedSocket, activeChat]);

  const sendMessage = (
    chatId: string,
    content: string,
    type: string = 'TEXT',
    media?: any,
    replyTo?: string,
    forwarded?: boolean,
    sharedContact?: any,
    gifId?: string,
    clientId?: string
  ) => {
    const finalClientId = clientId || Math.random().toString(36).substring(7);

    // Optimistically insert message to RTK cache
    if (userRef.current) {
      const optimisticMsg: any = {
        id: finalClientId,
        chatId,
        senderId: userRef.current.id,
        content,
        type,
        media,
        replyTo: replyTo ? { id: replyTo } : undefined,
        forwarded,
        sharedContact,
        gifId,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        isOptimistic: true,
      };

      const updateFn = (draft: any) => {
        if (draft && draft.data && draft.data.messages) {
          const exists = draft.data.messages.some(
            (m: any) => m.id === finalClientId || m.clientId === finalClientId
          );
          if (!exists) draft.data.messages.push(optimisticMsg);
        }
      };

      dispatch(chatApi.util.updateQueryData('getMessages', { chatId } as any, updateFn));
      dispatch(
        chatApi.util.updateQueryData('getMessages', { chatId, cursor: undefined }, updateFn)
      );
      dispatch(chatApi.util.updateQueryData('getMessages', { chatId, cursor: null }, updateFn));

      // Optimistically update getChats lastMessage preview
      dispatch(
        chatApi.util.updateQueryData('getChats', undefined, (draft) => {
          if (draft && draft.data) {
            const chat = draft.data.find((c: any) => c.id === chatId);
            if (chat) {
              chat.lastMessage = optimisticMsg;
              chat.updatedAt = optimisticMsg.createdAt;
              draft.data.sort(
                (a: any, b: any) =>
                  new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
              );
            }
          }
        })
      );
    }

    if (socketRef.current) {
      socketRef.current.emit(
        'send_message',
        {
          chatId,
          content,
          type,
          media,
          replyTo,
          forwarded,
          sharedContact,
          gifId,
          clientId: finalClientId,
        },
        (response: any) => {
          if (response && response.success) {
            const realStatus = response.status || 'SENT';
            const realId = response.messageId || finalClientId;
            const updateFn = (draft: any) => {
              if (draft && draft.data && draft.data.messages) {
                const index = draft.data.messages.findIndex((m: any) => m.id === finalClientId);
                if (index !== -1) {
                  draft.data.messages[index] = {
                    ...draft.data.messages[index],
                    id: realId,
                    status: realStatus,
                    isOptimistic: false,
                  };
                }
              }
            };
            dispatch(chatApi.util.updateQueryData('getMessages', { chatId } as any, updateFn));
            dispatch(
              chatApi.util.updateQueryData('getMessages', { chatId, cursor: undefined }, updateFn)
            );
            dispatch(
              chatApi.util.updateQueryData('getMessages', { chatId, cursor: null }, updateFn)
            );
          } else {
            const updateFn = (draft: any) => {
              if (draft && draft.data && draft.data.messages) {
                const index = draft.data.messages.findIndex((m: any) => m.id === finalClientId);
                if (index !== -1) {
                  draft.data.messages[index].status = 'FAILED';
                  draft.data.messages[index].isOptimistic = false;
                }
              }
            };
            dispatch(chatApi.util.updateQueryData('getMessages', { chatId } as any, updateFn));
            dispatch(
              chatApi.util.updateQueryData('getMessages', { chatId, cursor: undefined }, updateFn)
            );
            dispatch(
              chatApi.util.updateQueryData('getMessages', { chatId, cursor: null }, updateFn)
            );
          }
        }
      );
    }
  };

  const emitCallInitiate = (receiverId: string, type: string, offer: RTCSessionDescriptionInit) => {
    socketRef.current?.emit('call_initiate', { receiverId, caller: user, type, offer });
  };

  const emitCallAccept = (callerId: string, answer: RTCSessionDescriptionInit) => {
    socketRef.current?.emit('call_accept', { callerId, answer });
  };

  const emitCallReject = (callerId: string) => {
    socketRef.current?.emit('call_reject', { callerId });
  };

  const emitCallEnd = (targetId: string) => {
    socketRef.current?.emit('call_end', { targetId });
  };

  const emitIceCandidate = (targetId: string, candidate: RTCIceCandidateInit) => {
    socketRef.current?.emit('ice_candidate', { targetId, candidate });
  };

  return (
    <SocketContext.Provider
      value={{
        socket: connectedSocket,
        sendMessage,
        emitCallInitiate,
        emitCallAccept,
        emitCallReject,
        emitCallEnd,
        emitIceCandidate,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
