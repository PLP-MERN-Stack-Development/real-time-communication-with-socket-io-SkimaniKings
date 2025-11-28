import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import socketService from '../services/socket';
import { ChatState, Message, User, SocketEvent } from '../types';

const initialState: ChatState = {
  isConnected: false,
  currentUser: null,
  activeRoomId: 'general',
  messages: [],
  users: [],
  typingUsers: [],
  notifications: [],
  call: {
    isActive: false,
    isIncoming: false,
    isVideo: false,
    status: 'ended'
  }
};

type Action =
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'SET_USER'; payload: User }
  | { type: 'SET_USERS'; payload: User[] }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'SET_ACTIVE_ROOM'; payload: string }
  | { type: 'SET_TYPING'; payload: string }
  | { type: 'REMOVE_TYPING'; payload: string }
  | { type: 'START_CALL'; payload: { isVideo: boolean, remoteUserId: string } }
  | { type: 'SET_CALL_STATUS'; payload: 'dialing' | 'ringing' | 'connected' | 'ended' }
  | { type: 'CALL_ACCEPTED'; payload: { remoteUserId: string, remoteUserName: string, remoteUserAvatar?: string } }
  | { type: 'END_CALL' };

const chatReducer = (state: ChatState, action: Action): ChatState => {
  switch (action.type) {
    case 'SET_CONNECTED':
      return { ...state, isConnected: action.payload };
    case 'SET_USER':
      return { ...state, currentUser: action.payload };
    case 'SET_USERS':
      return { ...state, users: action.payload };
    case 'ADD_MESSAGE':
      if (state.messages.some(m => m.id === action.payload.id)) return state;
      return { ...state, messages: [...state.messages, action.payload] };
    case 'SET_ACTIVE_ROOM':
      return { ...state, activeRoomId: action.payload };
    case 'SET_TYPING':
      if (state.typingUsers.includes(action.payload)) return state;
      return { ...state, typingUsers: [...state.typingUsers, action.payload] };
    case 'REMOVE_TYPING':
      return { ...state, typingUsers: state.typingUsers.filter(u => u !== action.payload) };
    case 'START_CALL':
      return { 
          ...state, 
          call: { 
              isActive: true, 
              isIncoming: false, 
              isVideo: action.payload.isVideo, 
              remoteUserId: action.payload.remoteUserId,
              status: 'dialing' 
          } 
      };
    case 'SET_CALL_STATUS':
      return { ...state, call: { ...state.call, status: action.payload } };
    case 'CALL_ACCEPTED':
      // Guard: Don't accept call if we already ended it
      if (!state.call.isActive) return state;
      return { 
          ...state, 
          call: { 
              ...state.call, 
              status: 'connected',
              remoteUserId: action.payload.remoteUserId,
              remoteUserName: action.payload.remoteUserName,
              remoteUserAvatar: action.payload.remoteUserAvatar
          } 
      };
    case 'END_CALL':
      return { 
          ...state, 
          call: { 
              isActive: false, 
              isIncoming: false, 
              isVideo: false, 
              status: 'ended' 
          } 
      };
    default:
      return state;
  }
};

const ChatContext = createContext<{
  state: ChatState;
  login: (username: string) => void;
  sendMessage: (text: string, type?: 'text'|'image', fileUrl?: string) => void;
  changeRoom: (roomId: string) => void;
  sendTyping: () => void;
  startCall: (isVideo: boolean) => void;
  endCall: () => void;
} | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  useEffect(() => {
    // Setup socket listeners
    const handleConnect = () => dispatch({ type: 'SET_CONNECTED', payload: true });
    const handleDisconnect = () => dispatch({ type: 'SET_CONNECTED', payload: false });
    const handleMessage = (msg: Message) => {
        dispatch({ type: 'ADD_MESSAGE', payload: msg });
        if (state.currentUser && msg.senderId !== state.currentUser.id) {
           const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
           audio.volume = 0.5;
           audio.play().catch(e => console.log('Audio play failed', e));
        }
    };
    const handleUsers = (users: User[]) => dispatch({ type: 'SET_USERS', payload: users });
    const handleTyping = ({ username }: { username: string, userId: string }) => {
        if(state.currentUser && username !== state.currentUser.username) {
            dispatch({ type: 'SET_TYPING', payload: username });
        }
    };
    const handleStopTyping = (data: { userId: string, username?: string }) => {
         if (data.username) {
             dispatch({ type: 'REMOVE_TYPING', payload: data.username });
         } else if (data.userId === 'user-1') {
             dispatch({ type: 'REMOVE_TYPING', payload: 'Alice' });
         }
    };
    const handleCallAccepted = (data: any) => {
        dispatch({ type: 'CALL_ACCEPTED', payload: data });
    };

    socketService.on(SocketEvent.CONNECT, handleConnect);
    socketService.on(SocketEvent.DISCONNECT, handleDisconnect);
    socketService.on(SocketEvent.RECEIVE_MESSAGE, handleMessage);
    socketService.on(SocketEvent.USERS_LIST, handleUsers);
    socketService.on(SocketEvent.TYPING, handleTyping);
    socketService.on(SocketEvent.STOP_TYPING, handleStopTyping);
    socketService.on(SocketEvent.CALL_ACCEPTED, handleCallAccepted);

    // Initial connect
    socketService.connect();

    return () => {
      socketService.disconnect();
      socketService.off(SocketEvent.CONNECT, handleConnect);
      socketService.off(SocketEvent.RECEIVE_MESSAGE, handleMessage);
      socketService.off(SocketEvent.USERS_LIST, handleUsers);
      socketService.off(SocketEvent.TYPING, handleTyping);
      socketService.off(SocketEvent.STOP_TYPING, handleStopTyping);
      socketService.off(SocketEvent.CALL_ACCEPTED, handleCallAccepted);
    };
  }, [state.currentUser]);

  const login = useCallback((username: string) => {
    const user: User = {
      id: socketService.id,
      username,
      status: 'online',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
    };
    socketService.emit('login', user);
    dispatch({ type: 'SET_USER', payload: user });
  }, []);

  const sendMessage = useCallback((text: string, type: 'text'|'image' = 'text', fileUrl?: string) => {
    if (!state.currentUser) return;
    
    const msg: Message = {
      id: Date.now().toString(),
      text,
      senderId: state.currentUser.id,
      senderName: state.currentUser.username,
      timestamp: Date.now(),
      roomId: state.activeRoomId,
      type,
      fileUrl
    };
    
    socketService.emit(SocketEvent.SEND_MESSAGE, msg);
  }, [state.currentUser, state.activeRoomId]);

  const changeRoom = useCallback((roomId: string) => {
    dispatch({ type: 'SET_ACTIVE_ROOM', payload: roomId });
    socketService.emit(SocketEvent.JOIN_ROOM, roomId);
  }, []);

  const sendTyping = useCallback(() => {
      socketService.emit(SocketEvent.TYPING, { roomId: state.activeRoomId, username: state.currentUser?.username });
  }, [state.activeRoomId, state.currentUser]);

  const startCall = useCallback((isVideo: boolean) => {
      // In this demo, we assume we are calling the active room user (DM)
      if (state.activeRoomId === 'general' || state.activeRoomId === 'tech' || state.activeRoomId === 'random') {
          alert("Can only call in Direct Messages");
          return;
      }
      
      dispatch({ type: 'START_CALL', payload: { isVideo, remoteUserId: state.activeRoomId } });
      socketService.emit(SocketEvent.CALL_USER, { toUserId: state.activeRoomId, isVideo });
  }, [state.activeRoomId]);

  const endCall = useCallback(() => {
      dispatch({ type: 'END_CALL' });
      socketService.emit(SocketEvent.CALL_ENDED, {});
  }, []);

  return (
    <ChatContext.Provider value={{ state, login, sendMessage, changeRoom, sendTyping, startCall, endCall }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChat must be used within ChatProvider");
  return context;
};