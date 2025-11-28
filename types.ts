export interface User {
  id: string;
  username: string;
  avatar?: string;
  status: 'online' | 'offline' | 'busy';
}

export interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: number;
  roomId?: string; // If 'public' or specific room
  toUserId?: string; // If private message
  type: 'text' | 'image' | 'system';
  reactions?: Record<string, string[]>; // emoji -> userIds
  fileUrl?: string;
}

export interface Room {
  id: string;
  name: string;
  type: 'public' | 'private' | 'group';
  unreadCount?: number;
  lastMessage?: string;
  participants?: string[]; // user IDs
}

export interface CallState {
  isActive: boolean;
  isIncoming: boolean;
  isVideo: boolean;
  remoteUserId?: string;
  remoteUserName?: string;
  remoteUserAvatar?: string;
  status: 'dialing' | 'ringing' | 'connected' | 'ended';
}

export interface ChatState {
  isConnected: boolean;
  currentUser: User | null;
  activeRoomId: string; // 'general' or a user ID for DM
  messages: Message[];
  users: User[];
  typingUsers: string[]; // List of names/IDs typing
  notifications: string[];
  call: CallState;
}

export enum SocketEvent {
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  JOIN_ROOM = 'join_room',
  LEAVE_ROOM = 'leave_room',
  SEND_MESSAGE = 'send_message',
  RECEIVE_MESSAGE = 'receive_message',
  TYPING = 'typing',
  STOP_TYPING = 'stop_typing',
  USER_JOINED = 'user_joined',
  USER_LEFT = 'user_left',
  USERS_LIST = 'users_list',
  CALL_USER = 'call_user',
  CALL_INCOMING = 'call_incoming',
  CALL_ACCEPTED = 'call_accepted',
  CALL_REJECTED = 'call_rejected',
  CALL_ENDED = 'call_ended',
}