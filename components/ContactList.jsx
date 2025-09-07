// components/ContactList.jsx
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, MessageCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { fetchMessages } from "../lib/messages";
import { useUIStore, useAuthStore } from "../lib/store";
import { Input } from "../src/components/ui/input";
import { Button } from "../src/components/ui/button";
import { Badge } from "../src/components/ui/badge";

export default function ContactList() {
  const [searchQuery, setSearchQuery] = useState("");
  const { activeContactEmail, setActiveContact, setMobileMenuOpen } =
    useUIStore();
  const { user } = useAuthStore();

  const { data: fetchedMessages = [], isLoading } = useQuery({
    queryKey: ["messages"],
    queryFn: fetchMessages,
    refetchInterval: 2000,
    refetchOnWindowFocus: true,
  });

  const contacts = useMemo(() => {
    if (!user) return [];
    const map = new Map();

    for (const m of fetchedMessages) {
      const other =
        m.sender_email === user.email ? m.receiver_email : m.sender_email;
      if (!other || other === user.email) continue;

      // Safe derivation
      const base = String(other || "");
      const simple = base.includes("@") ? base.split("@") : base;
      const initials = String(simple || "")
        .slice(0, 2)
        .toUpperCase();

      const cur = map.get(other) || {
        email: other,
        name: simple || other,
        avatar: initials || "??",
        lastMessage: "",
        lastMessageTime: null,
        unreadCount: 0,
      };

      if (
        !cur.lastMessageTime ||
        new Date(m.sent_at) > new Date(cur.lastMessageTime)
      ) {
        cur.lastMessage = m.content;
        cur.lastMessageTime = m.sent_at;
      }
      if (m.receiver_email === user.email && !m.read) cur.unreadCount += 1;

      map.set(other, cur);
    }

    let list = Array.from(map.values()).sort(
      (a, b) =>
        new Date(b.lastMessageTime || 0) - new Date(a.lastMessageTime || 0)
    );

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.email.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          (c.lastMessage || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [fetchedMessages, user, searchQuery]);

  const handleContactSelect = (contact) => {
    setActiveContact(contact.email);
    setMobileMenuOpen(false);
  };

  const handleNewChat = () => {
    const input = window.prompt("Enter email to chat with:");
    if (!input) return;
    const email = String(input).trim();
    if (!email || !email.includes("@")) return;
    setActiveContact(email);
    setMobileMenuOpen(false);
  };

  if (isLoading) {
    return (
      <div className="h-full bg-chat-panel border-r border-chat-surface-alt">
        <div className="p-4 border-b border-chat-surface-alt">
          <div className="h-10 bg-chat-surface animate-pulse rounded-lg"></div>
        </div>
        <div className="p-4 space-y-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-chat-surface animate-pulse rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-chat-surface animate-pulse rounded w-3/4"></div>
                <div className="h-3 bg-chat-surface animate-pulse rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-chat-panel border-r border-chat-surface-alt flex flex-col">
      <div className="p-4 border-b border-chat-surface-alt">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-brand font-bold text-chat-text">Chats</h1>
          <Button
            onClick={handleNewChat}
            size="sm"
            className="bg-chat-accent hover:bg-green-600 text-white p-2"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-chat-text-muted w-4 h-4" />
          <Input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-chat-surface border-chat-surface-alt text-chat-text placeholder-chat-text-muted focus:border-chat-accent"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto chat-scrollbar">
        {contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-16 h-16 bg-chat-surface rounded-full flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8 text-chat-text-muted" />
            </div>
            <h3 className="text-chat-text font-medium mb-2">
              No conversations yet
            </h3>
            <p className="text-chat-text-muted text-sm mb-4">
              Start a new conversation to see chats here
            </p>
            <Button
              onClick={handleNewChat}
              className="bg-chat-accent hover:bg-green-600 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Chat
            </Button>
          </div>
        ) : (
          <AnimatePresence>
            {contacts.map((contact, index) => (
              <motion.div
                key={contact.email}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleContactSelect(contact)}
                className={`contact-item ${
                  activeContactEmail === contact.email
                    ? "bg-chat-surface-alt border-r-2 border-chat-accent"
                    : ""
                }`}
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-medium bg-green-600">
                    {contact.avatar}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-chat-text truncate">
                      {contact.name}
                    </h3>
                    <span className="text-xs text-chat-text-muted">
                      {contact.lastMessageTime &&
                        new Date(contact.lastMessageTime).toLocaleTimeString(
                          "en-US",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          }
                        )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-sm text-chat-text-muted truncate flex-1">
                      {contact.lastMessage || "No messages yet"}
                    </p>
                    {contact.unreadCount > 0 && (
                      <Badge className="bg-chat-accent text-white text-xs ml-2 min-w-[20px] h-5 flex items-center justify-center">
                        {contact.unreadCount > 99 ? "99+" : contact.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
