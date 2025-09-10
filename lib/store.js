import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ---------- Auth store ----------
export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      setAuth: (token, user) =>
        set({ token, user, isAuthenticated: true }),

      clearAuth: () =>
        set({ token: null, user: null, isAuthenticated: false }),

      getToken: () => get().token,
    }),
    {
      name: 'wirewave-auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// ---------- UI store ----------
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
      toasts: [...state.toasts, newToast],
    }));

    // auto remove after 5s
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 5000);

    return id;
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  setActiveContact: (email) => set({ activeContactEmail: email }),
  setMobileMenuOpen: (isOpen) => set({ isMobileMenuOpen: isOpen }),
  setTyping: (isTyping) => set({ isTyping }),

  addTypingUser: (email) =>
    set((state) => {
      const newTypingUsers = new Set(state.typingUsers);
      newTypingUsers.add(email);
      return { typingUsers: newTypingUsers };
    }),

  removeTypingUser: (email) =>
    set((state) => {
      const newTypingUsers = new Set(state.typingUsers);
      newTypingUsers.delete(email);
      return { typingUsers: newTypingUsers };
    }),
}));

// ---------- Chat store ----------
export const useChatStore = create((set, get) => ({
  messages: [],
  contacts: [],
  onlineUsers: new Set(),

  // utility to rebuild contacts from all messages
  rebuildContacts: () => {
    const { messages, contacts: prevContacts } = get();
    const { user } = useAuthStore.getState();
    const map = new Map();

    for (const m of messages) {
      const contactEmail =
        m.sender_email === user?.email ? m.receiver_email : m.sender_email;

      // find existing contact to preserve avatar/name
      const prev = prevContacts.find((c) => c.email === contactEmail);

      if (!map.has(contactEmail)) {
        map.set(contactEmail, {
          email: contactEmail,
          lastMessage: m,
          unreadCount: 0,
          avatar_url: prev?.avatar_url || null,
          name: prev?.name || null,
          about: prev?.about || null,
        });
      }

      const contact = map.get(contactEmail);

      // update last message
      if (
        new Date(m.sent_at) > new Date(contact.lastMessage.sent_at)
      ) {
        contact.lastMessage = m;
      }

      // increment unread if from contact and not read
      if (m.sender_email === contactEmail && !m.read) {
        contact.unreadCount += 1;
      }
    }

    const sorted = Array.from(map.values()).sort(
      (a, b) =>
        new Date(b.lastMessage.sent_at) -
        new Date(a.lastMessage.sent_at)
    );

    set({ contacts: sorted });
  },

  setMessages: (messages) => {
    set({ messages });
    get().rebuildContacts();
  },

  addMessage: (message) => {
    set((state) => ({
      messages: [...state.messages, message],
    }));
    get().rebuildContacts();
  },

  updateMessage: (messageId, updates) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      ),
    }));
    get().rebuildContacts();
  },

  setContacts: (contacts) => set({ contacts }),

  addContact: (contact) =>
    set((state) => {
      const exists = state.contacts.find(
        (c) => c.email === contact.email
      );
      if (exists) return state;
      return { contacts: [...state.contacts, contact] };
    }),

  setUserOnline: (email) =>
    set((state) => {
      const newOnlineUsers = new Set(state.onlineUsers);
      newOnlineUsers.add(email);
      return { onlineUsers: newOnlineUsers };
    }),

  setUserOffline: (email) =>
    set((state) => {
      const newOnlineUsers = new Set(state.onlineUsers);
      newOnlineUsers.delete(email);
      return { onlineUsers: newOnlineUsers };
    }),

  getConversationWith: (email) => {
    const messages = get().messages;
    return messages
      .filter(
        (msg) =>
          msg.sender_email === email ||
          msg.receiver_email === email
      )
      .sort((a, b) => new Date(a.sent_at) - new Date(b.sent_at));
  },

  getUnreadCount: (email) => {
    const messages = get().messages;
    return messages.filter(
      (msg) => msg.sender_email === email && !msg.read
    ).length;
  },
}));

// ---------- Messages store (fetch/send/delete) ----------
export const useMessagesStore = create((set, get) => ({
  loading: false,
  error: null,

  // --- fetch all messages for a contact ---
  fetchMessages: async (contactEmail) => {
    const { getToken } = useAuthStore.getState();
    const token = getToken();
    if (!token) return;

    set({ loading: true, error: null });

    try {
      const res = await fetch(
        `http://localhost:3000/messages/${contactEmail}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) throw new Error("Failed to fetch messages");

      const data = await res.json();
      useChatStore.getState().setMessages(data);
    } catch (err) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  // --- send message ---
  sendMessage: async (receiverEmail, content) => {
    const { getToken, user } = useAuthStore.getState();
    const token = getToken();
    if (!token) return;

    try {
      const res = await fetch(`http://localhost:3000/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          receiver_email: receiverEmail,
          content,
        }),
      });
      if (!res.ok) throw new Error("Failed to send message");

      const message = await res.json();
      useChatStore.getState().addMessage(message);
    } catch (err) {
      console.error("sendMessage error:", err);
    }
  },

  // --- delete single message ---
  deleteMessage: async (id) => {
    const { getToken } = useAuthStore.getState();
    const token = getToken();
    if (!token) return;

    try {
      const res = await fetch(`http://localhost:3000/messages/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete message");

      useChatStore
        .getState()
        .updateMessage(id, { deleted: true, content: "Message deleted" });
    } catch (err) {
      console.error("deleteMessage error:", err);
    }
  },

  // --- clear all messages with a contact ---
  clearChat: async (contactEmail) => {
    const { getToken } = useAuthStore.getState();
    const token = getToken();
    if (!token) return;

    try {
      const res = await fetch(
        `http://localhost:3000/messages/clear/${contactEmail}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) throw new Error("Failed to clear chat");

      // remove from local store
      const { messages } = useChatStore.getState();
      const filtered = messages.filter(
        (m) =>
          m.sender_email !== contactEmail &&
          m.receiver_email !== contactEmail
      );
      useChatStore.getState().setMessages(filtered);
    } catch (err) {
      console.error("clearChat error:", err);
    }
  },

  // --- mark message as read ---
  markAsRead: (id) => {
    useChatStore.getState().updateMessage(id, { read: true });
  },

  // --- group messages by date ---
  groupMessagesByDate: (messages) => {
    if (!messages || !Array.isArray(messages)) return {};
    const groups = {};
    messages.forEach((m) => {
      const date = new Date(m.sent_at).toLocaleDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(m);
    });
    return groups;
  },
}));
