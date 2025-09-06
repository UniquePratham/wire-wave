import apiClient, { handleApiError, createRateLimiter } from './axios';
import { useChatStore, useUIStore } from './store';
import DOMPurify from 'dompurify';

// Rate limiter for sending messages (max 10 per minute)
const sendMessageRateLimit = createRateLimiter(10, 60000);

// Fetch all messages
export const fetchMessages = async () => {
  try {
    const response = await apiClient.get('/messages');
    const messages = response.data || [];
    
    // Sanitize message content
    const sanitizedMessages = messages.map(msg => ({
      ...msg,
      content: DOMPurify.sanitize(msg.content),
    }));
    
    const { setMessages } = useChatStore.getState();
    setMessages(sanitizedMessages);
    
    return sanitizedMessages;
  } catch (error) {
    handleApiError(error, 'Failed to fetch messages.');
    throw error;
  }
};

// Send a new message
export const sendMessage = async (receiverEmail, content) => {
  try {
    // Rate limiting check
    sendMessageRateLimit();
    
    // Validate content
    if (!content || content.trim().length === 0) {
      throw new Error('Message content cannot be empty.');
    }
    
    if (content.length > 2000) {
      throw new Error('Message is too long. Maximum 2000 characters allowed.');
    }
    
    // Sanitize content before sending
    const sanitizedContent = DOMPurify.sanitize(content.trim());
    
    const response = await apiClient.post('/messages', {
      receiver_email: receiverEmail,
      content: sanitizedContent,
    });
    
    const newMessage = response.data;
    
    // Add to local store
    const { addMessage } = useChatStore.getState();
    addMessage({
      ...newMessage,
      content: sanitizedContent,
    });
    
    const { addToast } = useUIStore.getState();
    addToast({
      type: 'success',
      title: 'Message Sent',
      message: 'Your message has been delivered.',
    });
    
    return newMessage;
  } catch (error) {
    if (error.message.includes('Too many requests')) {
      const { addToast } = useUIStore.getState();
      addToast({
        type: 'error',
        title: 'Rate Limit Exceeded',
        message: 'Please wait a moment before sending another message.',
      });
    } else {
      handleApiError(error, 'Failed to send message.');
    }
    throw error;
  }
};

// Mark message as read
export const markMessageAsRead = async (messageId) => {
  try {
    const response = await apiClient.post(`/messages/${messageId}/read`);
    const updatedMessage = response.data;
    
    // Update local store
    const { updateMessage } = useChatStore.getState();
    updateMessage(messageId, { read: true });
    
    return updatedMessage;
  } catch (error) {
    console.error('Failed to mark message as read:', error);
    // Don't show error toast for read receipts as it's not critical
    throw error;
  }
};

// Mark multiple messages as read (batch operation)
export const markMessagesAsRead = async (messageIds) => {
  const promises = messageIds.map(id => markMessageAsRead(id));
  
  try {
    await Promise.allSettled(promises);
  } catch (error) {
    console.error('Failed to mark some messages as read:', error);
  }
};

// Get conversation with a specific user
export const getConversationWith = (userEmail) => {
  const { getConversationWith } = useChatStore.getState();
  return getConversationWith(userEmail);
};

// Get unread message count for a user
export const getUnreadCount = (userEmail) => {
  const { getUnreadCount } = useChatStore.getState();
  return getUnreadCount(userEmail);
};

// Get all unread messages
export const getUnreadMessages = () => {
  const { messages } = useChatStore.getState();
  return messages.filter(msg => !msg.read);
};

// Search messages by content
export const searchMessages = (query, userEmail = null) => {
  const { messages } = useChatStore.getState();
  
  if (!query || query.trim().length === 0) {
    return [];
  }
  
  const searchTerm = query.toLowerCase().trim();
  
  return messages.filter(msg => {
    const matchesContent = msg.content.toLowerCase().includes(searchTerm);
    const matchesUser = userEmail ? 
      (msg.sender_email === userEmail || msg.receiver_email === userEmail) : 
      true;
    
    return matchesContent && matchesUser;
  });
};

// Format message timestamp
export const formatMessageTime = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInHours = (now - date) / (1000 * 60 * 60);
  
  if (diffInHours < 1) {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  } else if (diffInHours < 24) {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  } else if (diffInHours < 48) {
    return 'Yesterday';
  } else if (diffInHours < 168) { // 7 days
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  } else {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  }
};

// Format message date for grouping
export const formatMessageDate = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) {
    return 'Today';
  } else if (diffInDays === 1) {
    return 'Yesterday';
  } else if (diffInDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  } else {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'long', 
      day: 'numeric' 
    });
  }
};

// Group messages by date
export const groupMessagesByDate = (messages) => {
  const groups = {};
  
  messages.forEach(msg => {
    const dateKey = formatMessageDate(msg.sent_at);
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(msg);
  });
  
  return groups;
};

// Auto-link URLs in message content
export const linkifyText = (text) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-chat-secondary hover:underline">$1</a>');
};

// Sanitize and process message content for display
export const processMessageContent = (content) => {
  // First sanitize
  let processed = DOMPurify.sanitize(content);
  
  // Then linkify URLs
  processed = linkifyText(processed);
  
  // Sanitize again to ensure linked content is safe
  return DOMPurify.sanitize(processed);
};

// Debounced message fetching for real-time updates
let fetchTimeout = null;

export const debouncedFetchMessages = (delay = 1500) => {
  if (fetchTimeout) {
    clearTimeout(fetchTimeout);
  }
  
  fetchTimeout = setTimeout(() => {
    fetchMessages();
  }, delay);
};

// Stop debounced fetching
export const stopDebouncedFetching = () => {
  if (fetchTimeout) {
    clearTimeout(fetchTimeout);
    fetchTimeout = null;
  }
};