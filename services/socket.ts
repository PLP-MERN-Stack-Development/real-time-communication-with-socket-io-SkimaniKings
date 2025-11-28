import { User, Message, SocketEvent } from '../types';
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini
// Note: In a real production app, API calls should be routed through a backend to protect the key.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Mock implementation to allow the app to function in a preview environment without a Node backend
class MockSocket {
  private listeners: Record<string, Function[]> = {};
  public id: string = 'mock-client-' + Math.random().toString(36).substr(2, 9);
  public connected: boolean = false;
  private users: User[] = [
    { id: 'user-1', username: 'Alice', status: 'online', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice' },
    { id: 'user-2', username: 'Bob', status: 'busy', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob' },
    { id: 'user-3', username: 'Charlie', status: 'offline', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie' },
  ];
  private messageHistory: Record<string, Message[]> = {};
  private callTimeout: any = null;

  connect() {
    this.connected = true;
    setTimeout(() => {
      this.trigger(SocketEvent.CONNECT);
      this.trigger(SocketEvent.USERS_LIST, this.users);
    }, 500);
    return this;
  }

  disconnect() {
    this.connected = false;
    this.trigger(SocketEvent.DISCONNECT);
    return this;
  }

  on(event: string, callback: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return this;
  }

  off(event: string, callback: Function) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  emit(event: string, data: any) {
    console.log(`[MockSocket Emit] ${event}`, data);
    
    // Simulate server response logic
    if (event === SocketEvent.JOIN_ROOM) {
      // confirm join
    } else if (event === SocketEvent.SEND_MESSAGE) {
      // Echo back to sender and "broadcast"
      const msg = data as Message;
      
      // Store history
      const roomKey = msg.roomId || 'general';
      if (!this.messageHistory[roomKey]) this.messageHistory[roomKey] = [];
      this.messageHistory[roomKey].push(msg);
      if (this.messageHistory[roomKey].length > 20) this.messageHistory[roomKey].shift();

      setTimeout(() => {
        this.trigger(SocketEvent.RECEIVE_MESSAGE, msg);
        
        // Trigger bot response logic
        this.handleBotResponse(msg);
      }, 100);
    } else if (event === SocketEvent.TYPING) {
      // In a real app, this goes to server, then server broadcasts. 
    } else if (event === 'login') {
      const newUser = { ...data, id: this.id, status: 'online' };
      this.users.push(newUser);
      this.trigger('login_success', newUser);
      this.trigger(SocketEvent.USERS_LIST, this.users);
    } else if (event === SocketEvent.CALL_USER) {
      // Simulate calling a user
      const { toUserId, isVideo } = data;
      const targetUser = this.users.find(u => u.id === toUserId);
      
      if (targetUser) {
        // Clear any existing call timeout
        if (this.callTimeout) clearTimeout(this.callTimeout);

        // Simulate ringing delay then accept
        this.callTimeout = setTimeout(() => {
          this.trigger(SocketEvent.CALL_ACCEPTED, { 
             remoteUserId: targetUser.id,
             remoteUserName: targetUser.username,
             remoteUserAvatar: targetUser.avatar
          });
          this.callTimeout = null;
        }, 2000);
      }
    } else if (event === SocketEvent.CALL_ENDED) {
       // Cancel call simulation if user hangs up
       if (this.callTimeout) {
         clearTimeout(this.callTimeout);
         this.callTimeout = null;
       }
    }
  }

  private trigger(event: string, ...args: any[]) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(...args));
    }
  }

  private handleBotResponse(msg: Message) {
      // Prevent bot self-reply loops if we were fully simulating users, 
      // but here msg.senderId is the real user (or mocked current user).
      
      const isPublic = ['general', 'tech', 'random'].includes(msg.roomId || '');
      
      // Potential responders are everyone except the sender
      const potentialResponders = this.users.filter(u => u.id !== msg.senderId);
      
      let responder: User | undefined;

      if (!isPublic) {
          // Direct Message: If roomId matches a user ID, that user is the target
          responder = potentialResponders.find(u => u.id === msg.roomId);
      } else {
          // Public Room: Check for mentions or random participation
          responder = potentialResponders.find(u => msg.text.toLowerCase().includes(u.username.toLowerCase()));
          
          // If no specific mention, Alice might reply to general messages occasionally
          if (!responder && msg.roomId === 'general' && Math.random() > 0.6) {
              responder = potentialResponders.find(u => u.username === 'Alice');
          }
      }

      // If we found a responder and they are not offline (or if they are offline, they shouldn't reply instantly)
      if (responder && responder.status !== 'offline') {
          this.scheduleResponse(responder, msg, isPublic);
      }
  }

  private async scheduleResponse(bot: User, originalMsg: Message, isPublic: boolean) {
      // 1. Simulate "reading/thinking" delay
      const thinkDelay = 1000 + Math.random() * 1500;

      setTimeout(async () => {
          // 2. Start Typing
          this.trigger(SocketEvent.TYPING, { username: bot.username, userId: bot.id, roomId: originalMsg.roomId });

          // 3. Generate content with Gemini
          const replyText = await this.generateResponseWithAI(bot, originalMsg);

          // 4. Simulate typing duration
          const typeDuration = Math.min(3000, 1000 + (replyText.length * 20)); 

          setTimeout(() => {
              // 5. Stop Typing
              this.trigger(SocketEvent.STOP_TYPING, { username: bot.username, userId: bot.id, roomId: originalMsg.roomId });

              // 6. Send Message
              const targetRoomId = isPublic ? originalMsg.roomId : originalMsg.senderId;

              const replyMsg: Message = {
                  id: 'msg-' + Math.random().toString(36).substr(2, 9),
                  text: replyText,
                  senderId: bot.id,
                  senderName: bot.username,
                  timestamp: Date.now(),
                  roomId: targetRoomId,
                  type: 'text'
              };
              
               // Store history
              const roomKey = originalMsg.roomId || 'general';
              if (!this.messageHistory[roomKey]) this.messageHistory[roomKey] = [];
              this.messageHistory[roomKey].push(replyMsg);

              this.trigger(SocketEvent.RECEIVE_MESSAGE, replyMsg);

          }, typeDuration);

      }, thinkDelay);
  }

  private async generateResponseWithAI(bot: User, lastMsg: Message): Promise<string> {
      try {
          // Get history for context
          const roomKey = lastMsg.roomId || 'general';
          const history = this.messageHistory[roomKey] || [];
          const historyText = history.slice(-10).map(m => `${m.senderName}: ${m.text}`).join('\n');

          const prompt = `
            You are playing the role of ${bot.username} in a chat application.
            Your persona:
            - If you are Alice: Friendly, helpful, likes emojis.
            - If you are Bob: Brief, professional, busy but polite.
            - If you are Charlie: Tech-savvy, sarcastic, funny.
            
            Current chat room: ${roomKey}.
            
            Recent conversation history:
            ${historyText}
            
            Respond to the last message from ${lastMsg.senderName} naturally and keeping with your persona. 
            Keep it relatively short (under 50 words).
            Do not include your name in the response.
          `;

          const response = await ai.models.generateContent({
             model: 'gemini-2.5-flash',
             contents: prompt,
          });

          return response.text || "...";

      } catch (error) {
          console.error("AI Generation failed:", error);
          return "That's interesting!"; // Fallback
      }
  }
}

export const socketService = new MockSocket();
export default socketService;