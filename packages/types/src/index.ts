export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  notifications: {
    sound: boolean;
    browser: boolean;
  };
  privacy: {
    lastSeen: 'EVERYONE' | 'CONTACTS' | 'NOBODY';
    profilePhoto: 'EVERYONE' | 'CONTACTS' | 'NOBODY';
    readReceipts: boolean;
  };
}

export interface User {
  id: string;
  email: string;
  username: string;
  fullName: string;
  displayName: string;
  about: string;
  avatarUrl?: string;
  status: 'ONLINE' | 'OFFLINE';
  profilePhoto?: string;
  bio?: string;
  emailVerified: boolean;
  isOnline: boolean;
  lastSeen?: Date;
  settings: UserSettings;
  mutedChats: string[];
  blockedUsers: string[]; // Array of User IDs
  blockedBy?: string[];
}

export interface Contact {
  id: string;
  contactUser: User;
  customName?: string;
  isBlocked: boolean;
  isFavourite?: boolean;
  isMuted?: boolean;
  isLocked?: boolean;
  lockPin?: string;
  createdAt: Date;
}

export interface MediaMetadata {
  mediaId?: string;
  url: string;
  publicId: string;
  mimeType: string;
  size: number;
  name: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'SYSTEM' | 'CONTACT' | 'GIF';
  content: string;
  media?: MediaMetadata;
  gifId?: string;
  sharedContact?: {
    userId: string;
    fullName: string;
    username: string;
    profilePhoto?: string;
  };
  status: 'SENT' | 'DELIVERED' | 'READ';
  replyTo?: Message;
  forwarded?: boolean;
  isPinned?: boolean;
  starredBy?: string[];
  reactions?: { userId: string; emoji: string }[];
  deliveredAt?: Date;
  seenAt?: Date;
  createdAt: Date;
  isDeleted?: boolean;
}

export interface GroupMetadata {
  name: string;
  description?: string;
  avatarUrl?: string;
  admins: string[];
}

export interface Chat {
  id: string;
  type: 'DIRECT' | 'GROUP';
  participants: User[];
  lastMessage?: Message;
  unreadCounts: Record<string, number>;
  groupMetadata?: GroupMetadata;
  createdAt: Date;
  updatedAt: Date;
  isLocked?: boolean;
}

export interface StatusItem {
  id: string;
  type: 'TEXT' | 'IMAGE' | 'VIDEO';
  content?: string;
  media?: MediaMetadata;
  backgroundColor?: string;
  viewers: string[];
  createdAt: Date;
  expiresAt: Date;
}

export interface UserStatusGroup {
  user: Pick<User, 'id' | 'displayName' | 'avatarUrl'>;
  statuses: StatusItem[];
  isAllViewed: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface CallPayload {
  caller: User;
  receiverId: string;
  type: 'AUDIO' | 'VIDEO';
  offer?: RTCSessionDescriptionInit;
}

export interface CallAnswerPayload {
  callerId: string;
  answer: RTCSessionDescriptionInit;
}

export interface IceCandidatePayload {
  targetId: string;
  candidate: RTCIceCandidateInit;
}

export interface CallLog {
  id: string;
  type: 'AUDIO' | 'VIDEO';
  status: 'CONNECTED' | 'MISSED' | 'REJECTED';
  duration: number;
  createdAt: Date;
  isOutgoing: boolean;
  contactUser: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
}