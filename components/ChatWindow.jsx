// components/ChatWindow.jsx
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Smile,
  Paperclip,
  MoreVertical,
  Phone,
  Video,
  User2,
  Trash2,
  X,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "../src/components/ui/button";
import { Textarea } from "../src/components/ui/textarea";
import MessageBubble from "./MessageBubble";
import dynamic from "next/dynamic";

import { useUIStore, useAuthStore, useChatStore } from "../lib/store";
import {
  fetchMessages,
  sendMessage,
  deleteMessage as apiDeleteMessage,
  markMessageAsRead,
  groupMessagesByDate,
} from "../lib/messages";
import apiClient from "../lib/axios";

const Picker = dynamic(() => import("emoji-mart").then((m) => m.Picker), {
  ssr: false,
});

export default function ChatWindow() {
  const [messageText, setMessageText] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);

  const { activeContactEmail, typingUsers } = useUIStore((s) => ({
    activeContactEmail: s.activeContactEmail,
    typingUsers: s.typingUsers,
  }));
  const { user } = useAuthStore();
  // read messages from the chat store (safe default: [])
  const messages = useChatStore((s) => s.messages) || [];

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // FETCH: whenever the active contact or user change -> fetch all messages once
  useEffect(() => {
    if (!user) return;
    // fetch all messages for this user and populate useChatStore via fetchMessages
    fetchMessages().catch(() => {
      /* swallow - handled by lib/messages.js toast/error handling */
    });
  }, [activeContactEmail, user]);

  // Filter conversation messages safely
  const conversationMessages = (messages || [])
    .filter(
      (m) =>
        (m.sender_email === user?.email && m.receiver_email === activeContactEmail) ||
        (m.sender_email === activeContactEmail && m.receiver_email === user?.email)
    )
    .sort((a, b) => new Date(a.sent_at) - new Date(b.sent_at));

  const groupedMessages = groupMessagesByDate(conversationMessages || []);

  // Mark unread as read and scroll
  useEffect(() => {
    if (!Array.isArray(conversationMessages) || conversationMessages.length === 0) {
      scrollToBottom();
      return;
    }

    conversationMessages.forEach((m) => {
      if (m.sender_email === activeContactEmail && !m.read) {
        // mark on server + update store (lib/messages.markMessageAsRead does store update)
        markMessageAsRead(m.id).catch(() => {});
      }
    });

    scrollToBottom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeContactEmail, conversationMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !activeContactEmail) return;

    const content = replyTo
      ? `> ${replyTo.sender_email === user?.email ? "You" : replyTo.sender_email}: ${replyTo.content}\n${messageText.trim()}`
      : messageText.trim();

    try {
      await sendMessage(activeContactEmail, content);
      setMessageText("");
      setReplyTo(null);
      scrollToBottom();
    } catch {
      // handled by lib/messages (toasts / console)
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const onDeleteMessage = async (msgId) => {
    try {
      await apiDeleteMessage(msgId);
      // fetch latest messages to ensure consistency (apiDeleteMessage updates the store already,
      // but re-fetching is safe if you want server truth)
      // fetchMessages().catch(() => {});
    } catch {
      // handled in lib/messages
    }
  };

  const clearChat = async (email) => {
    try {
      await apiClient.post("/messages/clear", { chat_email: email });
      // re-fetch to update store
      await fetchMessages();
    } catch {
      // ignore - global handler in axios wrapper might show toasts
    }
  };

  const isContactTyping = typingUsers?.has?.(activeContactEmail);

  if (!activeContactEmail) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-chat-bg">
        <div className="text-center space-y-4">
          <div className="w-24 h-24 bg-chat-surface rounded-full flex items-center justify-center mx-auto">
            <Send className="w-12 h-12 text-chat-text-muted" />
          </div>
          <h2 className="text-xl font-medium text-chat-text">Welcome to WireWave</h2>
          <p className="text-chat-text-muted max-w-md">
            Select a conversation from the sidebar to start messaging, or create a new chat.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full grid grid-rows-[auto_1fr_auto] bg-chat-bg">
      {/* Header */}
      <div className="bg-chat-panel border-b border-chat-surface-alt px-4 py-3 flex justify-between items-center">
        <div>
          <h2 className="font-medium text-chat-text">{activeContactEmail}</h2>
          <p className="text-sm text-chat-text-muted">Last seen recently</p>
        </div>
        <div className="flex gap-1 relative">
          <Button size="sm" variant="ghost"><Phone className="w-4 h-4" /></Button>
          <Button size="sm" variant="ghost"><Video className="w-4 h-4" /></Button>
          <Button size="sm" variant="ghost" onClick={() => setShowMenu((v) => !v)}>
            <MoreVertical className="w-4 h-4" />
          </Button>
          {showMenu && (
            <div className="absolute right-0 mt-10 w-40 bg-chat-panel border border-chat-surface-alt rounded-md shadow-lg z-20">
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-red-400 hover:bg-chat-surface"
                onClick={() => clearChat(activeContactEmail)}
              >
                <Trash2 className="w-4 h-4" /> Delete chat
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="min-h-0 overflow-y-auto chat-scrollbar p-4 space-y-4">
        {Object.entries(groupedMessages || {}).map(([date, msgs]) => (
          <div key={date}>
            <div className="flex justify-center my-3">
              <div className="bg-chat-surface px-3 py-1 rounded-full text-xs text-chat-text-muted font-medium">
                {date}
              </div>
            </div>
            <AnimatePresence>
              {(msgs || []).map((message) => (
                <motion.div key={message.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <MessageBubble
                    message={message}
                    isOwn={message.sender_email === user?.email}
                    onReply={() => setReplyTo(message)}
                    onDelete={() => onDeleteMessage(message.id)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ))}
        {isContactTyping && (
          <div className="flex items-center space-x-2 px-3 py-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium bg-green-600">
              {activeContactEmail?.slice(0, 2).toUpperCase()}
            </div>
            <div className="bg-chat-surface rounded-chat px-3 py-2">
              <div className="typing-indicator">
                <div className="typing-dot" style={{ animationDelay: "0ms" }}></div>
                <div className="typing-dot" style={{ animationDelay: "150ms" }}></div>
                <div className="typing-dot" style={{ animationDelay: "300ms" }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div className="bg-chat-panel border-t border-chat-surface-alt px-3 py-3">
        {replyTo && (
          <div className="mb-2 flex justify-between items-start bg-chat-surface border border-chat-surface-alt rounded-md px-3 py-2">
            <span className="text-sm text-chat-text-muted truncate">Replying to: {replyTo.content}</span>
            <button onClick={() => setReplyTo(null)}>
              <X className="w-4 h-4 text-chat-text-muted" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <Button size="sm" variant="ghost"><Paperclip className="w-5 h-5" /></Button>
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type a message"
              rows={1}
              className="min-h-[44px] bg-chat-surface border-chat-surface-alt text-chat-text pr-20"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => setShowEmoji((v) => !v)}><Smile className="w-4 h-4" /></Button>
              {showEmoji && (
                <div className="absolute bottom-12 right-0 z-20">
                  <Picker theme="dark" onEmojiSelect={(e) => setMessageText((t) => t + (e.native || ""))} />
                </div>
              )}
            </div>
          </div>
          <Button onClick={handleSendMessage} disabled={!messageText.trim()} className="bg-chat-accent text-white">
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
