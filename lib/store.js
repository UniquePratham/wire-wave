import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Auth store
export const useAuthStore = create(
persist(
  (set, get) => ({
    token: null,
    user: null,
    isAuthenticated: false,
    setAuth: (token, user) => set({ token, user, isAuthenticated: true }),
    clearAuth: () => set({ token: null, user: null, isAuthenticated: false }),
    getToken: () => get().token,
  }),
  {
    name: 'wirewave-auth',
    partialize: (state) => ({ 
      token: state.token,    // keep token in persistence
      user: state.user,
      isAuthenticated: state.isAuthenticated
    }),
  }
)
);

// UI store for theme, toasts, and chat state
export const useUIStore = create((set, get) => ({
  theme: 'dark',
  toasts: [],
  activeContactEmail: null,
  isMobileMenuOpen: false,
  isTyping: false,
  typingUsers: new Set(),
  
  setTheme: (theme) => set({ theme }),
  
  addToast: (toast) => {
    const id = Date.now().toString();
    const newToast = { id, ...toast };
    set((state) => ({ 
      toasts: [...state.toasts, newToast] 
    }));
    
    // Auto remove toast after 5 seconds
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter(t => t.id !== id)
      }));
    }, 5000);
    
    return id;
  },
  
  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter(t => t.id !== id)
  })),
  
  setActiveContact: (email) => set({ activeContactEmail: email }),
  
  setMobileMenuOpen: (isOpen) => set({ isMobileMenuOpen: isOpen }),
  
  setTyping: (isTyping) => set({ isTyping }),
  
  addTypingUser: (email) => set((state) => {
    const newTypingUsers = new Set(state.typingUsers);
    newTypingUsers.add(email);
    return { typingUsers: newTypingUsers };
  }),
  
  removeTypingUser: (email) => set((state) => {
    const newTypingUsers = new Set(state.typingUsers);
    newTypingUsers.delete(email);
    return { typingUsers: newTypingUsers };
  }),
}));

// Chat store for messages and contacts
export const useChatStore = create((set, get) => ({
  messages: [],
  contacts: [],
  onlineUsers: new Set(),
  
  setMessages: (messages) => set({ messages }),
  
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),
  
  updateMessage: (messageId, updates) => set((state) => ({
    messages: state.messages.map(msg => 
      msg.id === messageId ? { ...msg, ...updates } : msg
    )
  })),
  
  setContacts: (contacts) => set({ contacts }),
  
  addContact: (contact) => set((state) => {
    const exists = state.contacts.find(c => c.email === contact.email);
    if (exists) return state;
    return { contacts: [...state.contacts, contact] };
  }),
  
  setUserOnline: (email) => set((state) => {
    const newOnlineUsers = new Set(state.onlineUsers);
    newOnlineUsers.add(email);
    return { onlineUsers: newOnlineUsers };
  }),
  
  setUserOffline: (email) => set((state) => {
    const newOnlineUsers = new Set(state.onlineUsers);
    newOnlineUsers.delete(email);
    return { onlineUsers: newOnlineUsers };
  }),
  
  getConversationWith: (email) => {
    const messages = get().messages;
    return messages.filter(msg => 
      (msg.sender_email === email) || (msg.receiver_email === email)
    ).sort((a, b) => new Date(a.sent_at) - new Date(b.sent_at));
  },
  
  getUnreadCount: (email) => {
    const messages = get().messages;
    return messages.filter(msg => 
      msg.sender_email === email && !msg.read
    ).length;
  },
}));