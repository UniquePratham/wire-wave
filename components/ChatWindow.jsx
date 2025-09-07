// components/ChatWindow.jsx
import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Smile,
  Paperclip,
  MoreVertical,
  Phone,
  Video,
} from "lucide-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";

import {
  fetchMessages,
  sendMessage,
  markMessageAsRead,
  groupMessagesByDate,
} from "../lib/messages";
import { useUIStore, useAuthStore } from "../lib/store";
import { Button } from "../src/components/ui/button";
import { Textarea } from "../src/components/ui/textarea";
import MessageBubble from "./MessageBubble";

export default function ChatWindow() {
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const queryClient = useQueryClient();

  const { activeContactEmail, typingUsers } = useUIStore();
  const { user } = useAuthStore();

  const allMessages = queryClient.getQueryData(["messages"]) || [];

  const conversationMessages = useMemo(() => {
    if (!activeContactEmail || !user) return [];
    return allMessages
      .filter(
        (m) =>
          (m.sender_email === user.email &&
            m.receiver_email === activeContactEmail) ||
          (m.sender_email === activeContactEmail &&
            m.receiver_email === user.email)
      )
      .sort((a, b) => new Date(a.sent_at) - new Date(b.sent_at));
  }, [allMessages, activeContactEmail, user]);

  const groupedMessages = useMemo(
    () => groupMessagesByDate(conversationMessages),
    [conversationMessages]
  );

  const contact = useMemo(() => {
    if (!activeContactEmail) return null;
    const base = String(activeContactEmail || "");
    const simple = base.includes("@") ? base.split("@") : base;
    const initials =
      String(simple || "")
        .slice(0, 2)
        .toUpperCase() || "??";
    return {
      email: activeContactEmail,
      name: simple || activeContactEmail,
      avatar: initials,
      isOnline: false,
    };
  }, [activeContactEmail]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversationMessages]);

  const sendMessageMutation = useMutation({
    mutationFn: ({ receiverEmail, content }) =>
      sendMessage(receiverEmail, content),
    onMutate: async ({ receiverEmail, content }) => {
      await queryClient.cancelQueries({ queryKey: ["messages"] });
      const previous = queryClient.getQueryData(["messages"]) || [];

      const optimistic = {
        id: Math.random(),
        sender_email: user?.email,
        receiver_email: receiverEmail,
        content,
        read: true,
        sent_at: new Date().toISOString(),
        optimistic: true,
      };

      queryClient.setQueryData(["messages"], (old = []) => [
        ...old,
        optimistic,
      ]);
      setMessageText("");
      scrollToBottom();
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(["messages"], ctx.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
  });

  useEffect(() => {
    if (!activeContactEmail || !user) return;
    const unread = conversationMessages.filter(
      (m) => m.sender_email === activeContactEmail && !m.read
    );
    unread.forEach((m) => {
      markMessageAsRead(m.id).catch(() => {});
    });
  }, [activeContactEmail, user, conversationMessages]);

  const handleTextareaChange = (e) => {
    const textarea = e.target;
    setMessageText(textarea.value);
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 150) + "px";
  };

  const handleSendMessage = () => {
    if (
      !messageText.trim() ||
      !activeContactEmail ||
      sendMessageMutation.isLoading
    )
      return;
    sendMessageMutation.mutate({
      receiverEmail: activeContactEmail,
      content: messageText.trim(),
    });
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const isContactTyping = typingUsers.has(activeContactEmail);

  if (!activeContactEmail) {
    return (
      <div className="flex-1 bg-chat-bg flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-24 h-24 bg-chat-surface rounded-full flex items-center justify-center mx-auto">
            <Send className="w-12 h-12 text-chat-text-muted" />
          </div>
          <h2 className="text-xl font-medium text-chat-text">
            Welcome to ChatPulse
          </h2>
          <p className="text-chat-text-muted max-w-md">
            Select a conversation from the sidebar to start messaging, or create
            a new chat.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-chat-bg flex flex-col">
      <div className="bg-chat-panel border-b border-chat-surface-alt p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium bg-green-600">
                {contact?.avatar}
              </div>
            </div>
            <div>
              <h2 className="font-medium text-chat-text">{contact?.name}</h2>
              <p className="text-sm text-chat-text-muted">
                {contact?.isOnline ? "Online" : "Last seen recently"}
              </p>
            </div>
          </div>
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

      <div className="flex-1 overflow-y-auto chat-scrollbar p-4 space-y-4">
        {Object.entries(groupedMessages).map(([date, messages]) => (
          <div key={date}>
            <div className="flex items-center justify-center my-4">
              <div className="bg-chat-surface px-3 py-1 rounded-full">
                <span className="text-xs text-chat-text-muted font-medium">
                  {date}
                </span>
              </div>
            </div>

            <AnimatePresence>
              {messages.map((message, index) => (
                <motion.div
                  key={`${message.id}-${index}`}
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

        {isContactTyping && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex items-center space-x-2 px-3 py-2"
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium bg-green-600">
              {contact?.avatar}
            </div>
            <div className="bg-chat-surface rounded-chat px-3 py-2">
              <div className="typing-indicator">
                <div
                  className="typing-dot"
                  style={{ animationDelay: "0ms" }}
                ></div>
                <div
                  className="typing-dot"
                  style={{ animationDelay: "150ms" }}
                ></div>
                <div
                  className="typing-dot"
                  style={{ animationDelay: "300ms" }}
                ></div>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="bg-chat-panel border-t border-chat-surface-alt p-4">
        <div className="flex items-end space-x-2">
          <Button
            size="sm"
            variant="ghost"
            className="text-chat-text-muted hover:text-chat-text hover:bg-chat-surface p-2"
          >
            <Paperclip className="w-5 h-5" />
          </Button>

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
            <Button
              size="sm"
              variant="ghost"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-chat-text-muted hover:text-chat-text p-1"
            >
              <Smile className="w-4 h-4" />
            </Button>
          </div>

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
