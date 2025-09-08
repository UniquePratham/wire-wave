import { io } from 'socket.io-client';
import { useAuthStore, useChatStore, useUIStore } from './store';

class SocketManager {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.connectionTimeout = null;
  }

  connect() {
    const WS_URL = process.env.NEXT_PUBLIC_WS_URL;
    const { user } = useAuthStore.getState();
    
    if (!user || this.socket?.connected) {
      return;
    }

    console.log('Attempting to connect to WebSocket:', WS_URL);

    this.socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      timeout: 5000,
      forceNew: true,
      auth: {
        email: user.email,
      },
    });

    this.setupEventListeners();
    
    // Set connection timeout
    this.connectionTimeout = setTimeout(() => {
      if (!this.isConnected) {
        console.log('Socket connection timeout - falling back to polling mode');
        this.disconnect();
      }
    }, 1000);
  }

  setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected successfully');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }

      const { user } = useAuthStore.getState();
      if (user) {
        this.socket.emit('user:online', { email: user.email });
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.isConnected = false;
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, don't reconnect
        return;
      }
      
      this.handleReconnect();
    });

    this.socket.on('connect_error', (error) => {
      console.log('Socket connection error:', error.message);
      this.isConnected = false;
      this.handleReconnect();
    });

    // Message events
    this.socket.on('message:new', (message) => {
      console.log('New message received:', message);
      const { addMessage } = useChatStore.getState();
      addMessage(message);
      
      // Show notification if not in active chat
      const { activeContactEmail } = useUIStore.getState();
      if (activeContactEmail !== message.sender_email) {
        this.showNotification(message);
      }
    });

    this.socket.on('message:read', (data) => {
      console.log('Message read:', data);
      const { updateMessage } = useChatStore.getState();
      updateMessage(data.messageId, { read: true });
    });

    // Typing events
    this.socket.on('user:typing', (data) => {
      const { addTypingUser } = useUIStore.getState();
      addTypingUser(data.email);
      
      // Remove typing indicator after 3 seconds
      setTimeout(() => {
        const { removeTypingUser } = useUIStore.getState();
        removeTypingUser(data.email);
      }, 3000);
    });

    this.socket.on('user:stop_typing', (data) => {
      const { removeTypingUser } = useUIStore.getState();
      removeTypingUser(data.email);
    });

    // Presence events
    this.socket.on('user:online', (data) => {
      const { setUserOnline } = useChatStore.getState();
      setUserOnline(data.email);
    });

    this.socket.on('user:offline', (data) => {
      const { setUserOffline } = useChatStore.getState();
      setUserOffline(data.email);
    });
  }

  handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached. Switching to polling mode.');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      if (!this.isConnected) {
        this.connect();
      }
    }, delay);
  }

  showNotification(message) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`New message from ${message.sender_email}`, {
        body: message.content.substring(0, 100),
        icon: '/favicon.ico',
        tag: 'wirewave-message',
      });
    }
  }

  // Emit events
  sendMessage(message) {
    if (this.socket?.connected) {
      this.socket.emit('message:send', message);
    }
  }

  markMessageRead(messageId) {
    if (this.socket?.connected) {
      this.socket.emit('message:read', { messageId });
    }
  }

  emitTyping(receiverEmail) {
    if (this.socket?.connected) {
      this.socket.emit('user:typing', { receiverEmail });
    }
  }

  emitStopTyping(receiverEmail) {
    if (this.socket?.connected) {
      this.socket.emit('user:stop_typing', { receiverEmail });
    }
  }

  disconnect() {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.isConnected = false;
    this.reconnectAttempts = 0;
  }
}

// Create singleton instance
const socketManager = new SocketManager();

export default socketManager;

// Helper functions for components
export const connectSocket = () => {
  socketManager.connect();
};

export const disconnectSocket = () => {
  socketManager.disconnect();
};

export const isSocketConnected = () => {
  return socketManager.isConnected;
};