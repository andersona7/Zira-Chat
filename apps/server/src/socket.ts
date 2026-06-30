import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { Message } from './models/Message';
import { Chat } from './models/Chat';
import { User } from './models/User';
import { Call } from './models/Call';
import type { MediaMetadata } from '@zira/types';
import { redisClient } from './config/redis';

const activeCalls = new Map<string, { callerId: string, receiverId: string, type: 'AUDIO' | 'VIDEO', startTime?: Date, dbCallId: string }>();
const getCallKey = (u1: string, u2: string) => [u1, u2].sort().join('-');

const checkBlockBetweenChatParticipants = async (chatId: string, userId: string): Promise<boolean> => {
  try {
    const chat = await Chat.findById(chatId);
    if (chat && chat.type === 'DIRECT') {
      const receiverId = chat.participants.find(p => p.toString() !== userId);
      if (receiverId) {
        const sender = await User.findById(userId);
        const receiver = await User.findById(receiverId);
        if (sender && receiver) {
          const isBlockedByReceiver = receiver.blockedUsers.map(id => id.toString()).includes(userId.toString());
          const isBlockedBySender = sender.blockedUsers.map(id => id.toString()).includes(receiverId.toString());
          return isBlockedByReceiver || isBlockedBySender;
        }
      }
    }
  } catch (e) {
    console.error('Error checking block relationship:', e);
  }
  return false;
};

let ioInstance: Server | null = null;

export const disconnectUserSockets = async (userId: string) => {
  if (ioInstance) {
    try {
      // Clean up presence in Redis before disconnecting sockets
      await redisClient.del(`presence:user:${userId}`);
      const sockets = await ioInstance.in(userId).fetchSockets();
      for (const socket of sockets) {
        socket.disconnect(true);
      }
      console.log(`Disconnected all sockets for user ${userId}`);
    } catch (err) {
      console.error(`Error disconnecting sockets for user ${userId}:`, err);
    }
  }
};

export const endActiveCallBetweenUsers = (u1: string, u2: string) => {
  const key = getCallKey(u1, u2);
  const activeCall = activeCalls.get(key);
  if (activeCall && ioInstance) {
    ioInstance.to(u1).emit('call_ended');
    ioInstance.to(u2).emit('call_ended');
    activeCalls.delete(key);
    Call.findByIdAndUpdate(activeCall.dbCallId, { status: 'REJECTED' }).exec().catch(err => console.error(err));
  }
};

export const setupSocketHandlers = (io: Server) => {
  ioInstance = io;
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      console.warn(`[SOCKET_AUTH] token_missing | socketId=${socket.id}`);
      return next(new Error('Authentication error: No token'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string; sessionId?: string };
      if (!decoded.sessionId) {
        console.warn(`[SOCKET_AUTH] invalid_session_claim | userId=${decoded.id} | socketId=${socket.id}`);
        return next(new Error('Authentication error: Invalid session claim'));
      }

      // Check if session is active in database
      const { Session } = await import('./models/Session');
      const session = await Session.findOne({ sessionId: decoded.sessionId, user: decoded.id });
      if (!session || session.status !== 'ACTIVE') {
        console.warn(`[SOCKET_AUTH] session_inactive | userId=${decoded.id} | sessionId=${decoded.sessionId} | status=${session?.status ?? 'NOT_FOUND'} | socketId=${socket.id}`);
        return next(new Error('Authentication error: Session inactive'));
      }

      socket.data.userId = decoded.id;
      socket.data.sessionId = decoded.sessionId;
      console.info(`[SOCKET_AUTH] success | userId=${decoded.id} | sessionId=${decoded.sessionId} | socketId=${socket.id}`);
      next();
    } catch (err: any) {
      const errorType = err.name === 'TokenExpiredError' ? 'expired_token' : 'invalid_token';
      console.warn(`[SOCKET_AUTH] ${errorType} | error=${err.message} | socketId=${socket.id}`);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;
    const sessionId = socket.data.sessionId;
    socket.join(userId);
    if (sessionId) {
      socket.join(`session:${sessionId}`);
    }

    // Track presence in Redis
    const presenceKey = `presence:user:${userId}`;
    let isFirst = false;
    
    const trackPresence = async () => {
      try {
        if (redisClient.isOpen) {
          await redisClient.sAdd(presenceKey, socket.id);
          const size = await redisClient.sCard(presenceKey);
          isFirst = (size === 1);
        } else {
          isFirst = true;
        }
      } catch (err) {
        console.error('Redis presence tracking error:', err);
        isFirst = true;
      }

      if (isFirst) {
        // First connection - Set user online
        try {
          await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });
          const chats = await Chat.find({ participants: userId });
          chats.forEach(chat => {
            chat.participants.forEach(p => {
              if (p.toString() !== userId) {
                io.to(p.toString()).emit('user_status_change', { userId, isOnline: true, lastSeen: new Date() });
              }
            });
          });
        } catch (err) {
          console.error('Error setting user online:', err);
        }
      }
    };
    trackPresence();

    socket.on('join_chat', async (chatId: string) => {
      socket.join(chatId);
      try {
        const now = new Date();
        
        // Mark SENT messages as READ (both delivered and seen now)
        await Message.updateMany(
          { chatId, senderId: { $ne: userId }, status: 'SENT' },
          { $set: { status: 'READ', deliveredAt: now, seenAt: now } }
        );

        // Mark DELIVERED messages as READ (seen now)
        const result = await Message.updateMany(
          { chatId, senderId: { $ne: userId }, status: 'DELIVERED' },
          { $set: { status: 'READ', seenAt: now } }
        );
        
        const chat = await Chat.findById(chatId);
        if (chat) {
          chat.unreadCounts.set(userId, 0);
          await chat.save();
          
          chat.participants.forEach(p => {
            io.to(p.toString()).emit('messages_read', { chatId, readBy: userId, seenAt: now });
          });
        }
      } catch (err) {
        console.error('Error marking messages read on join:', err);
      }
    });

    socket.on('leave_chat', (chatId: string) => socket.leave(chatId));

    socket.on('typing', async (data: { chatId: string, isTyping: boolean }) => {
      if (await checkBlockBetweenChatParticipants(data.chatId, userId)) return;
      socket.to(data.chatId).emit('typing_state', { chatId: data.chatId, userId, isTyping: data.isTyping });
    });

    socket.on('send_message', async (data: { chatId: string, content: string, type: string, media?: MediaMetadata, gifId?: string, replyTo?: string, forwarded?: boolean, sharedContact?: any, clientId?: string }, callback?: any) => {
      try {
        const chat = await Chat.findById(data.chatId);
        if (!chat) {
          if (typeof callback === 'function') callback({ success: false, error: 'Chat not found' });
          return;
        }

        // Privacy Check: Is either sender or receiver blocked by the other?
        if (await checkBlockBetweenChatParticipants(data.chatId, userId)) {
          socket.emit('message_error', {
            chatId: data.chatId,
            error: 'Cannot send message. Blocked user relationship exists.'
          });
          if (typeof callback === 'function') callback({ success: false, error: 'Blocked relationship exists' });
          return;
        }

        // Idempotency: Check if this message was already created
        if (data.clientId) {
          const existingMsg = await Message.findOne({ clientId: data.clientId, senderId: userId });
          if (existingMsg) {
            console.log(`[Socket] Duplicate message ignored (idempotent): clientId=${data.clientId}`);
            if (typeof callback === 'function') {
              callback({ success: true, messageId: existingMsg._id.toString(), status: existingMsg.status });
            }
            return;
          }
        }

        // Delivery Ticks Logic
        let initialStatus = 'SENT';
        const isGroup = chat.type === 'GROUP';
        if (!isGroup) {
          const receiverId = chat.participants.find(p => p.toString() !== userId)?.toString();
          if (receiverId) {
            const receiverRoom = io.sockets.adapter.rooms.get(receiverId);
            if (receiverRoom && receiverRoom.size > 0) {
              initialStatus = 'DELIVERED';
              const chatRoom = io.sockets.adapter.rooms.get(data.chatId);
              if (chatRoom) {
                const receiverSockets = Array.from(receiverRoom);
                const hasJoinedChat = receiverSockets.some(sId => chatRoom.has(sId));
                if (hasJoinedChat) {
                  initialStatus = 'READ';
                }
              }
            }
          }
        }

        const now = new Date();

        if (data.media && data.media.mediaId) {
          try {
            const Media = (await import('./models/Media')).default;
            const mediaDoc = await Media.findById(data.media.mediaId);
            if (mediaDoc) {
              mediaDoc.referenceCount += 1;
              if (!mediaDoc.chatId) {
                mediaDoc.chatId = new mongoose.Types.ObjectId(data.chatId) as any;
              }
              await mediaDoc.save();
            }
          } catch (mediaErr) {
            console.error('Failed to increment media reference count in socket:', mediaErr);
          }
        }

        const message = await Message.create({
          chatId: data.chatId,
          senderId: userId,
          content: data.content,
          type: data.type || 'TEXT',
          media: data.media,
          gifId: data.gifId,
          sharedContact: data.sharedContact,
          replyTo: data.replyTo,
          forwarded: data.forwarded || false,
          status: initialStatus,
          deliveredAt: initialStatus === 'DELIVERED' || initialStatus === 'READ' ? now : undefined,
          seenAt: initialStatus === 'READ' ? now : undefined,
          clientId: data.clientId,
        });

        const populatedMsg = await message.populate('replyTo');

        chat.lastMessage = message._id as any;
        chat.updatedAt = new Date();
        
        const chatRoom = io.sockets.adapter.rooms.get(data.chatId);
        const activeUserIdsInChat = new Set<string>();
        if (chatRoom) {
          for (const socketId of chatRoom) {
            const clientSocket = io.sockets.sockets.get(socketId);
            if (clientSocket && clientSocket.data.userId) {
              activeUserIdsInChat.add(clientSocket.data.userId.toString());
            }
          }
        }

        chat.participants.forEach(p => {
          const pId = p.toString();
          if (pId !== userId && !activeUserIdsInChat.has(pId)) {
            const current = chat.unreadCounts.get(pId) || 0;
            chat.unreadCounts.set(pId, current + 1);
          }
        });
        chat.deletedFor = [];
        await chat.save();

        const populatedMessage = {
          id: populatedMsg._id,
          chatId: populatedMsg.chatId,
          senderId: populatedMsg.senderId,
          content: populatedMsg.content,
          type: populatedMsg.type,
          media: (populatedMsg.media && populatedMsg.media.url) ? populatedMsg.media : undefined,
          gifId: populatedMsg.gifId,
          sharedContact: populatedMsg.sharedContact ? {
            userId: populatedMsg.sharedContact.userId?.toString(),
            fullName: populatedMsg.sharedContact.fullName,
            username: populatedMsg.sharedContact.username,
            profilePhoto: populatedMsg.sharedContact.profilePhoto,
          } : undefined,
          status: populatedMsg.status,
          replyTo: populatedMsg.replyTo ? {
            id: (populatedMsg.replyTo as any)._id,
            chatId: (populatedMsg.replyTo as any).chatId,
            senderId: (populatedMsg.replyTo as any).senderId,
            type: (populatedMsg.replyTo as any).type,
            content: (populatedMsg.replyTo as any).content,
            media: ((populatedMsg.replyTo as any).media && (populatedMsg.replyTo as any).media.url) ? (populatedMsg.replyTo as any).media : undefined,
            gifId: (populatedMsg.replyTo as any).gifId,
            status: (populatedMsg.replyTo as any).status,
            createdAt: (populatedMsg.replyTo as any).createdAt,
          } : undefined,
          forwarded: populatedMsg.forwarded,
          isPinned: populatedMsg.isPinned,
          starredBy: populatedMsg.starredBy?.map(id => id.toString()) || [],
          reactions: populatedMsg.reactions?.map(r => ({ userId: r.userId.toString(), emoji: r.emoji })) || [],
          deliveredAt: populatedMsg.deliveredAt,
          seenAt: populatedMsg.seenAt,
          createdAt: populatedMsg.createdAt,
          clientId: data.clientId,
        };

        io.to(data.chatId).emit('receive_message', populatedMessage);
        chat.participants.forEach(p => {
          io.to(p.toString()).emit('chat_updated', {
            chatId: chat._id,
            lastMessage: populatedMessage,
            updatedAt: chat.updatedAt
          });
        });

        if (typeof callback === 'function') {
          callback({ success: true, messageId: message._id.toString(), status: message.status });
        }
      } catch (error: any) {
        console.error('Socket message error:', error);
        if (typeof callback === 'function') {
          callback({ success: false, error: error.message });
        }
      }
    });

    socket.on('delete_message', async (data: { messageId: string, chatId: string }) => {
      console.log(`[Socket] delete_message event received. messageId: ${data.messageId}, chatId: ${data.chatId}, userId: ${userId}`);
      try {
        const msg = await Message.findById(data.messageId);
        if (!msg) {
          console.log(`[Socket] delete_message failed: Message not found for id ${data.messageId}`);
          return;
        }
        console.log(`[Socket] found message. senderId: ${msg.senderId.toString()}, userId: ${userId}`);
        if (msg.senderId.toString() !== userId) {
          console.log(`[Socket] delete_message failed: senderId ${msg.senderId.toString()} does not match userId ${userId}`);
          return;
        }
        
        msg.isDeleted = true;
        msg.content = 'This message was deleted';
        msg.media = undefined;
        msg.type = 'TEXT';
        msg.replyTo = undefined;
        msg.forwarded = false;
        msg.isPinned = false;
        msg.starredBy = [];
        msg.reactions = [];
        await msg.save();
        console.log('[Socket] message deleted successfully in DB.');
        
        const chat = await Chat.findById(data.chatId);
        if (chat && chat.lastMessage?.toString() === data.messageId) {
          chat.updatedAt = new Date();
          await chat.save();
          
          chat.participants.forEach(p => {
            io.to(p.toString()).emit('chat_updated', {
              chatId: chat._id,
              lastMessage: {
                id: msg._id,
                content: msg.content,
                senderId: msg.senderId,
                createdAt: msg.createdAt,
                isDeleted: true
              },
              updatedAt: chat.updatedAt
            });
          });
        }
        
        io.to(data.chatId).emit('message_deleted', { messageId: data.messageId, chatId: data.chatId });
        console.log(`[Socket] emitted message_deleted to room ${data.chatId}`);
      } catch (err) {
        console.error('Delete message error:', err);
      }
    });

    socket.on('react_message', async (data: { messageId: string, chatId: string, emoji: string }) => {
      try {
        if (await checkBlockBetweenChatParticipants(data.chatId, userId)) return;
        const msg = await Message.findById(data.messageId);
        if (!msg) return;
        
        const reactions = msg.reactions || [];
        const existingIndex = reactions.findIndex(r => r.userId.toString() === userId);
        if (existingIndex > -1) {
          if (reactions[existingIndex].emoji === data.emoji) {
            reactions.splice(existingIndex, 1);
          } else {
            reactions[existingIndex].emoji = data.emoji;
          }
        } else {
          reactions.push({ userId: new mongoose.Types.ObjectId(userId), emoji: data.emoji });
        }
        msg.reactions = reactions;
        await msg.save();
        
        io.to(data.chatId).emit('message_reacted', {
          messageId: data.messageId,
          chatId: data.chatId,
          reactions: msg.reactions.map(r => ({ userId: r.userId.toString(), emoji: r.emoji }))
        });
      } catch (err) {
        console.error('React message error:', err);
      }
    });

    socket.on('pin_message', async (data: { messageId: string, chatId: string, isPinned: boolean }) => {
      try {
        if (await checkBlockBetweenChatParticipants(data.chatId, userId)) return;
        const msg = await Message.findById(data.messageId);
        if (!msg) return;
        msg.isPinned = data.isPinned;
        await msg.save();
        io.to(data.chatId).emit('message_pinned', { messageId: data.messageId, chatId: data.chatId, isPinned: data.isPinned });
      } catch (err) {
        console.error('Pin message error:', err);
      }
    });

    socket.on('star_message', async (data: { messageId: string, chatId: string, isStarred: boolean }) => {
      try {
        if (await checkBlockBetweenChatParticipants(data.chatId, userId)) return;
        const msg = await Message.findById(data.messageId);
        if (!msg) return;
        const starredBy = msg.starredBy || [];
        const index = starredBy.findIndex(id => id.toString() === userId);
        if (data.isStarred && index === -1) {
          starredBy.push(new mongoose.Types.ObjectId(userId));
        } else if (!data.isStarred && index > -1) {
          starredBy.splice(index, 1);
        }
        msg.starredBy = starredBy;
        await msg.save();
        io.to(data.chatId).emit('message_starred', {
          messageId: data.messageId,
          chatId: data.chatId,
          starredBy: msg.starredBy.map(id => id.toString())
        });
      } catch (err) {
        console.error('Star message error:', err);
      }
    });

    // WebRTC Signaling
    socket.on('call_initiate', async (payload: { receiverId: string, caller: any, type: string, offer: any }) => {
      // Privacy Check
      const sender = await User.findById(userId);
      const receiver = await User.findById(payload.receiverId);
      if (sender && receiver) {
        const isBlockedByReceiver = receiver.blockedUsers.map(id => id.toString()).includes(userId.toString());
        const isBlockedBySender = sender.blockedUsers.map(id => id.toString()).includes(payload.receiverId.toString());
        if (isBlockedByReceiver || isBlockedBySender) {
          socket.emit('call_rejected'); // Auto reject if blocked in either direction
          return;
        }
      }

      try {
        const dbCall = await Call.create({
          caller: userId,
          receiver: payload.receiverId,
          type: payload.type === 'VIDEO' ? 'VIDEO' : 'AUDIO',
          status: 'MISSED',
        });
        activeCalls.set(getCallKey(userId, payload.receiverId), {
          callerId: userId,
          receiverId: payload.receiverId,
          type: payload.type === 'VIDEO' ? 'VIDEO' : 'AUDIO',
          dbCallId: dbCall._id.toString(),
        });
      } catch (err) {
        console.error('Call initiation log failed:', err);
      }

      io.to(payload.receiverId).emit('call_incoming', payload);
    });

    socket.on('call_accept', async (payload: { callerId: string, answer: any }) => {
      const key = getCallKey(payload.callerId, userId);
      const activeCall = activeCalls.get(key);
      if (activeCall) {
        activeCall.startTime = new Date();
        await Call.findByIdAndUpdate(activeCall.dbCallId, { status: 'CONNECTED' });
      }
      io.to(payload.callerId).emit('call_accepted', payload);
    });

    socket.on('call_reject', async (payload: { callerId: string }) => {
      const key = getCallKey(payload.callerId, userId);
      const activeCall = activeCalls.get(key);
      if (activeCall) {
        await Call.findByIdAndUpdate(activeCall.dbCallId, { status: 'REJECTED' });
        activeCalls.delete(key);
      }
      io.to(payload.callerId).emit('call_rejected');
    });

    socket.on('call_end', async (payload: { targetId: string }) => {
      const key = getCallKey(userId, payload.targetId);
      const activeCall = activeCalls.get(key);
      if (activeCall) {
        let duration = 0;
        if (activeCall.startTime) {
          duration = Math.floor((Date.now() - activeCall.startTime.getTime()) / 1000);
        }
        await Call.findByIdAndUpdate(activeCall.dbCallId, { duration });
        activeCalls.delete(key);
      }
      io.to(payload.targetId).emit('call_ended');
    });

    socket.on('ice_candidate', (payload) => io.to(payload.targetId).emit('ice_candidate', payload));

    socket.on('disconnect', async () => {
      let shouldBroadcastOffline = false;
      const presenceKey = `presence:user:${userId}`;

      try {
        if (redisClient.isOpen) {
          await redisClient.sRem(presenceKey, socket.id);
          const size = await redisClient.sCard(presenceKey);
          if (size === 0) {
            await redisClient.del(presenceKey);
            shouldBroadcastOffline = true;
          }
        } else {
          shouldBroadcastOffline = true;
        }
      } catch (err) {
        console.error('Redis presence disconnect error:', err);
        shouldBroadcastOffline = true;
      }

      if (shouldBroadcastOffline) {
        const lastSeen = new Date();
        await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen });

        const chats = await Chat.find({ participants: userId });
        chats.forEach(chat => {
          chat.participants.forEach(p => {
            if (p.toString() !== userId) {
              io.to(p.toString()).emit('user_status_change', { userId, isOnline: false, lastSeen });
            }
          });
        });
      }

      // Clean up active calls
      for (const [key, call] of activeCalls.entries()) {
        if (call.callerId === userId || call.receiverId === userId) {
          let duration = 0;
          if (call.startTime) {
            duration = Math.floor((Date.now() - call.startTime.getTime()) / 1000);
          }
          Call.findByIdAndUpdate(call.dbCallId, { duration }).exec();
          const targetId = call.callerId === userId ? call.receiverId : call.callerId;
          io.to(targetId).emit('call_ended');
          activeCalls.delete(key);
        }
      }
    });
  });
};