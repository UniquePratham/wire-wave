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
  User2,
  Trash2,
  X,
  Image as ImageIcon,
} from "lucide-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import apiClient from "../lib/axios";
import {
  sendMessage,
  markMessageAsRead,
  groupMessagesByDate,
} from "../lib/messages";
import { useUIStore, useAuthStore } from "../lib/store";
import { Button } from "../src/components/ui/button";
import { Textarea } from "../src/components/ui/textarea";
import MessageBubble from "./MessageBubble";
// Emoji picker (install: npm i emoji-mart)
import dynamic from "next/dynamic";
const Picker = dynamic(() => import("emoji-mart").then((m) => m.Picker), {
  ssr: false,
});

export default function ChatWindow() {
  const [messageText, setMessageText] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [profileUser, setProfileUser] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
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
    // try to find avatar_url from an earlier profile fetch cached into messages (basic heuristic)
    const knownAvatar = null;
    return {
      email: activeContactEmail,
      name: simple || activeContactEmail,
      avatar: initials,
      avatar_url: knownAvatar,
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
      setReplyTo(null);
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
    // Prepend quoted text pattern (simple) if replying
    const content = replyTo
      ? `> ${
          replyTo.sender_email === user?.email ? "You" : replyTo.sender_email
        }: ${replyTo.content}\n${messageText.trim()}`
      : messageText.trim();
    sendMessageMutation.mutate({
      receiverEmail: activeContactEmail,
      content,
    });
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const onReplyMessage = (msg) => {
    setReplyTo({
      id: msg.id,
      content: msg.content,
      sender_email: msg.sender_email,
    });
    textareaRef.current?.focus();
  };

  const onDeleteMessage = async (msg) => {
    try {
      await apiClient.delete(`/messages/${msg.id}`); // DELETE /messages/:id
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    } catch {
      // handled globally
    }
  };

  const openProfile = async (email) => {
    try {
      const res = await apiClient.get("/users/search", { params: { email } });
      setProfileUser(res.data?.user_email ? res.data : { user_email: email });
    } catch {
      setProfileUser({ user_email: email });
    }
  };

  const clearChat = async (email) => {
    try {
      await apiClient.post("/messages/clear", { chat_email: email });
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    } catch {
      // handled globally
    }
  };

  const isContactTyping = typingUsers.has(activeContactEmail);

  if (!activeContactEmail) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-chat-bg">
        <div className="text-center space-y-4">
          <div className="w-24 h-24 bg-chat-surface rounded-full flex items-center justify-center mx-auto">
            <Send className="w-12 h-12 text-chat-text-muted" />
          </div>
          <h2 className="text-xl font-medium text-chat-text">
            Welcome to WireWave
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
    <div className="h-full grid grid-rows-[auto_1fr_auto] bg-chat-bg">
      {/* Header */}
      <div className="bg-chat-panel border-b border-chat-surface-alt px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className="w-10 h-10 rounded-full overflow-hidden bg-green-600 flex items-center justify-center text-white font-medium"
              onClick={() => openProfile(contact.email)}
              title="View profile"
            >
              {contact?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={contact.avatar_url}
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                contact?.avatar
              )}
            </button>
            <div>
              <h2 className="font-medium text-chat-text">{contact?.name}</h2>
              <p className="text-sm text-chat-text-muted">
                {contact?.isOnline ? "Online" : "Last seen recently"}
              </p>
            </div>
          </div>
          <div className="relative">
            <div className="flex items-center gap-1">
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
                onClick={() => setShowMenu((v) => !v)}
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </div>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-44 bg-chat-panel border border-chat-surface-alt rounded-md shadow-lg z-20">
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-chat-surface"
                  onClick={() => {
                    setShowMenu(false);
                    openProfile(contact.email);
                  }}
                >
                  <User2 className="w-4 h-4" />
                  View profile
                </button>
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-red-400 hover:bg-chat-surface"
                  onClick={() => {
                    setShowMenu(false);
                    clearChat(contact.email);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete chat
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages (scrollable) */}
      <div className="min-h-0 overflow-y-auto chat-scrollbar p-4 space-y-4">
        {Object.entries(groupedMessages).map(([date, messages]) => (
          <div key={date}>
            <div className="flex items-center justify-center my-3">
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
                  transition={{ delay: index * 0.02 }}
                >
                  <MessageBubble
                    message={message}
                    isOwn={message.sender_email === user?.email}
                    onReply={onReplyMessage}
                    onDelete={onDeleteMessage}
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

      {/* Composer (fixed bottom) */}
      <div className="bg-chat-panel border-t border-chat-surface-alt px-3 py-3 relative">
        {/* Quoted reply */}
        {replyTo && (
          <div className="mb-2 flex items-start justify-between rounded-md border border-chat-surface-alt bg-chat-surface px-3 py-2">
            <div className="text-sm">
              <span className="font-semibold mr-1">
                {replyTo.sender_email === user?.email
                  ? "You"
                  : replyTo.sender_email}
                :
              </span>
              <span className="text-chat-text-muted">
                {replyTo.content.slice(0, 140)}
              </span>
            </div>
            <button
              className="text-chat-text-muted hover:text-chat-text"
              title="Cancel reply"
              onClick={() => setReplyTo(null)}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="text-chat-text-muted hover:text-chat-text hover:bg-chat-surface p-2"
            title="Attach"
          >
            <Paperclip className="w-5 h-5" />
          </Button>

          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={messageText}
              onChange={handleTextareaChange}
              onKeyPress={handleKeyPress}
              placeholder={replyTo ? "Reply..." : "Type a message"}
              className="min-h-[44px] max-h-[150px] resize-none bg-chat-surface border-chat-surface-alt text-chat-text placeholder-chat-text-muted focus:border-chat-accent pr-20"
              rows={1}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="text-chat-text-muted hover:text-chat-text p-1"
                title="Emoji"
                onClick={() => setShowEmoji((v) => !v)}
              >
                <Smile className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-chat-text-muted hover:text-chat-text p-1"
                title="Image URL (future)"
              >
                <ImageIcon className="w-4 h-4" />
              </Button>
            </div>
            {showEmoji && (
              <div className="absolute bottom-12 right-0 z-20">
                <Picker
                  theme="dark"
                  onEmojiSelect={(e) => {
                    setMessageText((t) => t + (e.native || e.shortcodes || ""));
                    textareaRef.current?.focus();
                  }}
                />
              </div>
            )}
          </div>

          <Button
            onClick={handleSendMessage}
            disabled={!messageText.trim() || sendMessageMutation.isLoading}
            className="bg-chat-accent hover:bg-green-600 text-white p-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Send"
          >
            {sendMessageMutation.isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Profile Sheet */}
      {profileUser && (
        <div className="absolute inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setProfileUser(null)}
          />
          <ProfileSheet
            profileUser={profileUser}
            setProfileUser={setProfileUser}
          />
        </div>
      )}
    </div>
  );
}

function ProfileSheet({ profileUser, setProfileUser }) {
  const [form, setForm] = useState({
    name: profileUser.name || "",
    about: profileUser.about || "",
    avatar_url: profileUser.avatar_url || "",
  });

  const onSave = async () => {
    try {
      const res = await apiClient.put("/profile", form); // PUT /profile
      setProfileUser({ ...profileUser, ...res.data });
    } catch {
      // handled globally
    }
  };

  return (
    <div className="absolute right-0 top-0 h-full w-full sm:w-[380px] bg-chat-panel border-l border-chat-surface-alt p-4 overflow-y-auto">
      <h3 className="text-xl font-semibold mb-2">User profile</h3>
      <div className="space-y-3">
        <div className="w-16 h-16 rounded-full overflow-hidden bg-green-600 flex items-center justify-center text-white text-xl font-bold">
          {form.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={form.avatar_url}
              alt="avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            (
              profileUser.name?.slice(0, 2) ||
              profileUser.user_email?.slice(0, 2) ||
              "??"
            ).toUpperCase()
          )}
        </div>
        <div>
          <p className="text-sm text-chat-text-muted">Email</p>
          <p>{profileUser.user_email || profileUser.email}</p>
        </div>
        <div>
          <p className="text-sm text-chat-text-muted mb-1">Name</p>
          <input
            className="w-full bg-chat-surface border border-chat-surface-alt rounded px-3 py-2 outline-none focus:border-chat-accent"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div>
          <p className="text-sm text-chat-text-muted mb-1">About</p>
          <textarea
            className="w-full bg-chat-surface border border-chat-surface-alt rounded px-3 py-2 outline-none focus:border-chat-accent"
            value={form.about}
            onChange={(e) => setForm((f) => ({ ...f, about: e.target.value }))}
          />
        </div>
        <div>
          <p className="text-sm text-chat-text-muted mb-1">Avatar URL</p>
          <input
            className="w-full bg-chat-surface border border-chat-surface-alt rounded px-3 py-2 outline-none focus:border-chat-accent"
            placeholder="https://..."
            value={form.avatar_url}
            onChange={(e) =>
              setForm((f) => ({ ...f, avatar_url: e.target.value }))
            }
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setProfileUser(null)}>
            Close
          </Button>
          <Button className="bg-chat-accent text-white" onClick={onSave}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
