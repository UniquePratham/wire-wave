import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Smile, Paperclip, MoreVertical, Phone, Video } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { fetchMessages, sendMessage, markMessageAsRead, groupMessagesByDate } from '../lib/messages';
import { getContactByEmail, getDisplayName, getAvatarColor, isContactOnline } from '../lib/contacts';
import { useUIStore, useChatStore, useAuthStore } from '../lib/store';
import { Button } from '../src/components/ui/button';
import { Textarea } from '../src/components/ui/textarea';
import MessageBubble from './MessageBubble';

export default function ChatWindow() {
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const queryClient = useQueryClient();

  const { activeContactEmail, typingUsers } = useUIStore();
  const { user } = useAuthStore();
  const { getConversationWith } = useChatStore();

  // Get conversation messages
  const conversationMessages = useMemo(() => {
    if (!activeContactEmail) return [];
    return getConversationWith(activeContactEmail);
  }, [activeContactEmail, getConversationWith]);

  // Group messages by date
  const groupedMessages = useMemo(() => {
    return groupMessagesByDate(conversationMessages);
  }, [conversationMessages]);

  // Get contact info
  const contact = useMemo(() => {
    if (!activeContactEmail) return null;
    return getContactByEmail(activeContactEmail) || {
      email: activeContactEmail,
      name: getDisplayName(activeContactEmail),
      avatar: getDisplayName(activeContactEmail).substring(0, 2).toUpperCase(),
      isOnline: isContactOnline(activeContactEmail),
    };
  }, [activeContactEmail]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: ({ receiverEmail, content }) => sendMessage(receiverEmail, content),
    onSuccess: () => {
      queryClient.invalidateQueries(['messages']);
      setMessageText('');
      scrollToBottom();
    },
  });

  // Mark messages as read when opening conversation
  useEffect(() => {
    if (!activeContactEmail || !user) return;

    const unreadMessages = conversationMessages.filter(
      msg => msg.sender_email === activeContactEmail && !msg.read
    );

    unreadMessages.forEach(msg => {
      markMessageAsRead(msg.id).catch(console.error);
    });
  }, [activeContactEmail, conversationMessages, user]);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversationMessages]);

  // Handle textarea auto-resize
  const handleTextareaChange = (e) => {
    const textarea = e.target;
    setMessageText(textarea.value);
    
    // Auto-resize
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
  };

  // Handle send message
  const handleSendMessage = async () => {
    if (!messageText.trim() || !activeContactEmail || sendMessageMutation.isLoading) return;

    const content = messageText.trim();
    sendMessageMutation.mutate({
      receiverEmail: activeContactEmail,
      content,
    });
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Show typing indicator
  const isContactTyping = typingUsers.has(activeContactEmail);

  if (!activeContactEmail) {
    return (
      <div className="flex-1 bg-chat-bg flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-24 h-24 bg-chat-surface rounded-full flex items-center justify-center mx-auto">
            <Send className="w-12 h-12 text-chat-text-muted" />
          </div>
          <h2 className="text-xl font-medium text-chat-text">Welcome to ChatPulse</h2>
          <p className="text-chat-text-muted max-w-md">
            Select a conversation from the sidebar to start messaging, or create a new chat to connect with someone.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-chat-bg flex flex-col">
      {/* Chat Header */}
      <div className="bg-chat-panel border-b border-chat-surface-alt p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Avatar */}
            <div className="relative">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${getAvatarColor(activeContactEmail)}`}>
                {contact?.avatar}
              </div>
              {contact?.isOnline && (
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-chat-success border-2 border-chat-panel rounded-full"></div>
              )}
            </div>

            {/* Contact Info */}
            <div>
              <h2 className="font-medium text-chat-text">{contact?.name}</h2>
              <p className="text-sm text-chat-text-muted">
                {contact?.isOnline ? 'Online' : 'Last seen recently'}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="ghost"
              className="text-chat-text-muted hover:text-chat-text hover:bg-chat-surface"
            >
              <Phone className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-chat-text-muted hover:text-chat-text hover:bg-chat-surface"
            >
              <Video className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-chat-text-muted hover:text-chat-text hover:bg-chat-surface"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto chat-scrollbar p-4 space-y-4">
        {Object.entries(groupedMessages).map(([date, messages]) => (
          <div key={date}>
            {/* Date Separator */}
            <div className="flex items-center justify-center my-4">
              <div className="bg-chat-surface px-3 py-1 rounded-full">
                <span className="text-xs text-chat-text-muted font-medium">{date}</span>
              </div>
            </div>

            {/* Messages */}
            <AnimatePresence>
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <MessageBubble
                    message={message}
                    isOwn={message.sender_email === user?.email}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ))}

        {/* Typing Indicator */}
        {isContactTyping && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex items-center space-x-2 px-3 py-2"
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium ${getAvatarColor(activeContactEmail)}`}>
              {contact?.avatar}
            </div>
            <div className="bg-chat-surface rounded-chat px-3 py-2">
              <div className="typing-indicator">
                <div className="typing-dot" style={{ animationDelay: '0ms' }}></div>
                <div className="typing-dot" style={{ animationDelay: '150ms' }}></div>
                <div className="typing-dot" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Composer */}
      <div className="bg-chat-panel border-t border-chat-surface-alt p-4">
        <div className="flex items-end space-x-2">
          {/* Attachment Button */}
          <Button
            size="sm"
            variant="ghost"
            className="text-chat-text-muted hover:text-chat-text hover:bg-chat-surface p-2"
          >
            <Paperclip className="w-5 h-5" />
          </Button>

          {/* Message Input */}
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={messageText}
              onChange={handleTextareaChange}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="min-h-[44px] max-h-[150px] resize-none bg-chat-surface border-chat-surface-alt text-chat-text placeholder-chat-text-muted focus:border-chat-accent pr-12"
              rows={1}
            />
            
            {/* Emoji Button */}
            <Button
              size="sm"
              variant="ghost"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-chat-text-muted hover:text-chat-text p-1"
            >
              <Smile className="w-4 h-4" />
            </Button>
          </div>

          {/* Send Button */}
          <Button
            onClick={handleSendMessage}
            disabled={!messageText.trim() || sendMessageMutation.isLoading}
            className="bg-chat-accent hover:bg-green-600 text-white p-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sendMessageMutation.isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}