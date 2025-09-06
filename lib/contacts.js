import { useChatStore, useAuthStore } from './store';
import { formatMessageTime } from './messages';

// Extract contacts from messages since backend doesn't have a contacts endpoint
export const extractContactsFromMessages = () => {
  const { messages } = useChatStore.getState();
  const { user } = useAuthStore.getState();
  
  if (!user) return [];
  
  const contactsMap = new Map();
  const currentUserEmail = user.email;
  
  messages.forEach(msg => {
    const contactEmail = msg.sender_email === currentUserEmail 
      ? msg.receiver_email 
      : msg.sender_email;
    
    if (contactEmail === currentUserEmail) return; // Skip self
    
    const existing = contactsMap.get(contactEmail);
    const messageTime = new Date(msg.sent_at);
    
    if (!existing || messageTime > new Date(existing.lastMessageTime)) {
      contactsMap.set(contactEmail, {
        email: contactEmail,
        name: getDisplayName(contactEmail),
        avatar: generateAvatar(contactEmail),
        lastMessage: msg.content,
        lastMessageTime: msg.sent_at,
        unreadCount: 0, // Will be calculated separately
        isOnline: false, // Will be updated by socket events
      });
    }
  });
  
  // Calculate unread counts
  contactsMap.forEach((contact, email) => {
    const unreadCount = messages.filter(msg => 
      msg.sender_email === email && !msg.read
    ).length;
    contact.unreadCount = unreadCount;
  });
  
  // Convert to array and sort by last message time
  const contacts = Array.from(contactsMap.values()).sort((a, b) => 
    new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
  );
  
  return contacts;
};

// Generate display name from email
export const getDisplayName = (email) => {
  if (!email) return 'Unknown';
  
  // Extract name part from email (before @)
  const namePart = email.split('@')[0];
  
  // Convert to title case and replace dots/underscores with spaces
  return namePart
    .replace(/[._]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Generate avatar initials from email
export const generateAvatar = (email) => {
  if (!email) return 'U';
  
  const name = getDisplayName(email);
  const words = name.split(' ');
  
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  } else {
    return words[0].substring(0, 2).toUpperCase();
  }
};

// Generate avatar color based on email
export const getAvatarColor = (email) => {
  if (!email) return 'bg-gray-500';
  
  const colors = [
    'bg-red-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
    'bg-orange-500',
    'bg-cyan-500',
  ];
  
  // Generate consistent color based on email hash
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

// Search contacts by name or email
export const searchContacts = (contacts, query) => {
  if (!query || query.trim().length === 0) {
    return contacts;
  }
  
  const searchTerm = query.toLowerCase().trim();
  
  return contacts.filter(contact => 
    contact.name.toLowerCase().includes(searchTerm) ||
    contact.email.toLowerCase().includes(searchTerm) ||
    contact.lastMessage.toLowerCase().includes(searchTerm)
  );
};

// Get contact by email
export const getContactByEmail = (email) => {
  const contacts = extractContactsFromMessages();
  return contacts.find(contact => contact.email === email);
};

// Update contact online status
export const updateContactOnlineStatus = (email, isOnline) => {
  const { setUserOnline, setUserOffline } = useChatStore.getState();
  
  if (isOnline) {
    setUserOnline(email);
  } else {
    setUserOffline(email);
  }
};

// Get online status for contact
export const isContactOnline = (email) => {
  const { onlineUsers } = useChatStore.getState();
  return onlineUsers.has(email);
};

// Format last seen time
export const formatLastSeen = (timestamp) => {
  if (!timestamp) return 'Never';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diffInMinutes = Math.floor((now - date) / (1000 * 60));
  
  if (diffInMinutes < 1) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  } else if (diffInMinutes < 1440) { // 24 hours
    const hours = Math.floor(diffInMinutes / 60);
    return `${hours}h ago`;
  } else {
    const days = Math.floor(diffInMinutes / 1440);
    if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days}d ago`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  }
};

// Add a new contact (when starting a new conversation)
export const addNewContact = (email) => {
  const { addContact } = useChatStore.getState();
  
  const newContact = {
    email,
    name: getDisplayName(email),
    avatar: generateAvatar(email),
    lastMessage: '',
    lastMessageTime: new Date().toISOString(),
    unreadCount: 0,
    isOnline: false,
  };
  
  addContact(newContact);
  return newContact;
};

// Validate email for new contact
export const validateContactEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email || email.trim().length === 0) {
    return { isValid: false, error: 'Email is required' };
  }
  
  if (!emailRegex.test(email.trim())) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  
  const { user } = useAuthStore.getState();
  if (email.trim().toLowerCase() === user?.email?.toLowerCase()) {
    return { isValid: false, error: 'You cannot message yourself' };
  }
  
  return { isValid: true, error: null };
};

// Get conversation preview (last message snippet)
export const getConversationPreview = (email, maxLength = 50) => {
  const { messages } = useChatStore.getState();
  const { user } = useAuthStore.getState();
  
  if (!user) return '';
  
  const conversationMessages = messages
    .filter(msg => 
      (msg.sender_email === email && msg.receiver_email === user.email) ||
      (msg.sender_email === user.email && msg.receiver_email === email)
    )
    .sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at));
  
  if (conversationMessages.length === 0) return '';
  
  const lastMessage = conversationMessages[0];
  const isFromCurrentUser = lastMessage.sender_email === user.email;
  const prefix = isFromCurrentUser ? 'You: ' : '';
  
  let content = lastMessage.content;
  if (content.length > maxLength) {
    content = content.substring(0, maxLength - 3) + '...';
  }
  
  return prefix + content;
};

// Sort contacts by various criteria
export const sortContacts = (contacts, sortBy = 'lastMessage') => {
  const sortedContacts = [...contacts];
  
  switch (sortBy) {
    case 'name':
      return sortedContacts.sort((a, b) => a.name.localeCompare(b.name));
    
    case 'unread':
      return sortedContacts.sort((a, b) => {
        if (a.unreadCount !== b.unreadCount) {
          return b.unreadCount - a.unreadCount; // Unread first
        }
        return new Date(b.lastMessageTime) - new Date(a.lastMessageTime);
      });
    
    case 'online':
      return sortedContacts.sort((a, b) => {
        const aOnline = isContactOnline(a.email);
        const bOnline = isContactOnline(b.email);
        
        if (aOnline !== bOnline) {
          return bOnline - aOnline; // Online first
        }
        return new Date(b.lastMessageTime) - new Date(a.lastMessageTime);
      });
    
    case 'lastMessage':
    default:
      return sortedContacts.sort((a, b) => 
        new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
      );
  }
};