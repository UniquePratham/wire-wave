// components/ContactList.jsx
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  MessageCircle,
  MoreVertical,
  User2,
  Trash2,
  BellOff,
  LocateFixed,
  LogOut,
  X,
  UserCircle2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../lib/axios";
import { fetchMessages } from "../lib/messages";
import { useUIStore, useAuthStore } from "../lib/store";
import { Input } from "../src/components/ui/input";
import { Button } from "../src/components/ui/button";
import { Badge } from "../src/components/ui/badge";
import { logoutUser } from "../lib/auth";
import { createProfile, updateProfile } from "../lib/profile";

export default function ContactList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [emailQuery, setEmailQuery] = useState("");
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [newChatEmail, setNewChatEmail] = useState("");
  const [profileUser, setProfileUser] = useState(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false); // NEW: open editor
  const [profileForm, setProfileForm] = useState({
    // NEW: editor state
    name: "",
    about: "",
    avatar_url: "",
  });
  const [saving, setSaving] = useState(false);

  const { activeContactEmail, setActiveContact, setMobileMenuOpen } =
    useUIStore();
  const { user } = useAuthStore();

  const {
    data: fetchedMessages = [],
    isLoading,
    refetch,
  } = useQuery({
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

      const base = String(other || "");
      const simple = base.includes("@") ? base.split("@") : base;
      const initials = String(simple || "")
        .slice(0, 2)
        .toUpperCase();

      const cur = map.get(other) || {
        email: other,
        name: simple || other,
        avatar: initials || "??",
        avatar_url: null,
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

  const handleFindByEmail = async () => {
    const email = emailQuery.trim();
    if (!email) return;
    try {
      const res = await apiClient.get(`/users/search`, { params: { email } });
      setProfileUser(
        res.data?.user_email
          ? res.data
          : { user_email: email, error: "User not found" }
      );
    } catch {
      setProfileUser({ user_email: email, error: "User not found" });
    }
  };

  const openNewChat = () => {
    setNewChatEmail("");
    setIsNewChatOpen(true);
  };

  const startNewChat = () => {
    const email = newChatEmail.trim();
    if (!email || !email.includes("@")) return;
    setActiveContact(email);
    setIsNewChatOpen(false);
    setMobileMenuOpen(false);
  };

  const openProfile = async (email) => {
    try {
      const res = await apiClient.get(`/users/search`, { params: { email } });
      setProfileUser(res.data?.user_email ? res.data : { user_email: email });
    } catch {
      setProfileUser({ user_email: email });
    }
  };

  const clearChat = async (email) => {
    try {
      await apiClient.post("/messages/clear", { chat_email: email });
      await refetch();
    } catch {
      // handled globally
    }
  };

  const onLogout = async () => {
    setMoreOpen(false);
    await logoutUser();
  };

  // NEW: open own profile editor
  const handleOpenOwnProfile = async () => {
    setMoreOpen(false);
    // Optionally fetch existing profile to prefill:
    try {
      const res = await apiClient.get("/profile"); // relies on backend /profile GET returning current profile
      setProfileForm({
        name: res.data?.name || "",
        about: res.data?.about || "",
        avatar_url: res.data?.avatar_url || "",
      });
    } catch {
      setProfileForm({ name: "", about: "", avatar_url: "" });
    }
    setProfileOpen(true);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      // Try update first
      const data = await updateProfile(profileForm);
      // Optional: show toast and close
      setProfileOpen(false);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 404) {
        // No profile exists; create it
        const data = await createProfile(profileForm);
        setProfileOpen(false);
      } else {
        // surface error toast
        console.error("Profile save failed", err);
      }
    } finally {
      setSaving(false);
    }
  };

  const ProfileSheet = ({ initial }) => {
    const [form, setForm] = useState({
      name: initial.name || "",
      about: initial.about || "",
      avatar_url: initial.avatar_url || "",
    });

    const onSave = async () => {
      try {
        const res = await apiClient.put("/profile", form);
        setProfileUser({ ...initial, ...res.data });
      } catch {}
    };

    return (
      <div className="absolute inset-0 z-40">
        <div
          className="absolute inset-0 bg-black/50"
          onClick={() => setProfileUser(null)}
        />
        <div className="absolute right-0 top-0 h-full w-full sm:w-[380px] bg-chat-panel border-l border-chat-surface-alt p-4 overflow-y-auto">
          <h3 className="text-xl font-semibold mb-2">User profile</h3>
          {initial.error ? (
            <p className="text-red-400">{initial.error}</p>
          ) : (
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
                    initial.name?.slice(0, 2) ||
                    initial.user_email?.slice(0, 2) ||
                    "??"
                  ).toUpperCase()
                )}
              </div>
              <div>
                <p className="text-sm text-chat-text-muted">Email</p>
                <p>{initial.user_email || initial.email}</p>
              </div>
              <div>
                <p className="text-sm text-chat-text-muted mb-1">Name</p>
                <input
                  className="w-full bg-chat-surface border border-chat-surface-alt rounded px-3 py-2 outline-none focus:border-chat-accent"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </div>
              <div>
                <p className="text-sm text-chat-text-muted mb-1">About</p>
                <textarea
                  className="w-full bg-chat-surface border border-chat-surface-alt rounded px-3 py-2 outline-none focus:border-chat-accent"
                  value={form.about}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, about: e.target.value }))
                  }
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
          )}
        </div>
      </div>
    );
  };

  const ContactRow = ({ contact, index }) => {
    const isActive = activeContactEmail === contact.email;
    const [open, setOpen] = useState(false);
    return (
      <motion.div
        key={contact.email}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.03 }}
        className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-chat-surface transition ${
          isActive ? "bg-chat-surface-alt border-r-2 border-chat-accent" : ""
        }`}
        onClick={() => setActiveContact(contact.email)}
      >
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            className="w-12 h-12 rounded-full overflow-hidden bg-green-600 flex items-center justify-center text-white font-medium"
            title="View profile"
            onClick={() => openProfile(contact.email)}
          >
            {contact.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={contact.avatar_url}
                alt="avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              contact.avatar
            )}
          </button>
        </div>

        <div className="flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-1">
            <button
              className="font-medium text-chat-text truncate text-left hover:underline"
              onClick={() => openProfile(contact.email)}
              title={contact.email}
            >
              {contact.name}
            </button>
            <span className="text-xs text-chat-text-muted">
              {contact.lastMessageTime &&
                new Date(contact.lastMessageTime).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}
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
            <div className="relative ml-2">
              <button
                className="p-1 text-chat-text-muted hover:text-chat-text"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen((v) => !v);
                }}
                aria-label="More"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {open && (
                <div
                  className="absolute right-0 mt-2 w-40 bg-chat-panel border border-chat-surface-alt rounded-md shadow-lg z-30"
                  onMouseLeave={() => setOpen(false)}
                >
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-chat-surface"
                    onClick={() => {
                      setOpen(false); /* mute later */
                    }}
                  >
                    <BellOff className="w-4 h-4" />
                    Mute (soon)
                  </button>
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-chat-surface"
                    onClick={() => {
                      setOpen(false);
                      openProfile(contact.email);
                    }}
                  >
                    <User2 className="w-4 h-4" />
                    View profile
                  </button>
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-red-400 hover:bg-chat-surface"
                    onClick={() => {
                      setOpen(false);
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
      </motion.div>
    );
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
    <div className="h-full flex flex-col relative">
      {/* Top bar */}
      <div className="sticky top-0 z-30 p-3 border-b border-chat-surface-alt bg-chat-panel">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Input
              type="email"
              placeholder="Email"
              value={emailQuery}
              onChange={(e) => setEmailQuery(e.target.value)}
              className="w-[180px] bg-chat-surface border-chat-surface-alt text-chat-text placeholder-chat-text-muted focus:border-chat-accent"
            />
          </div>
          <Button
            onClick={handleFindByEmail}
            className="bg-chat-accent text-white"
            title="Find user"
          >
            <LocateFixed className="w-4 h-4" />
          </Button>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-chat-text-muted w-4 h-4" />
            <Input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-chat-surface border-chat-surface-alt text-chat-text placeholder-chat-text-muted focus:border-chat-accent"
            />
          </div>

          <Button
            onClick={openNewChat}
            className="bg-chat-accent text-white"
            title="New chat"
          >
            <Plus className="w-4 h-4" />
          </Button>

          {/* Overflow menu with Profile + Logout */}
          <div className="relative">
            <Button
              variant="ghost"
              className="text-chat-text-muted hover:text-chat-text"
              onClick={() => setMoreOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={moreOpen}
              title="More"
            >
              <MoreVertical className="w-5 h-5" />
            </Button>
            {moreOpen && (
              <div
                className="absolute right-0 mt-2 w-52 bg-chat-panel border border-chat-surface-alt rounded-md shadow-lg z-40"
                role="menu"
                onMouseLeave={() => setMoreOpen(false)}
              >
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-chat-surface"
                  onClick={handleOpenOwnProfile}
                >
                  <UserCircle2 className="w-4 h-4" />
                  Profile
                </button>
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-chat-surface"
                  onClick={() => {
                    setMoreOpen(false);
                    openNewChat();
                  }}
                >
                  <Plus className="w-4 h-4" />
                  New chat
                </button>
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-chat-surface"
                  onClick={onLogout}
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 min-h-0 overflow-y-auto chat-scrollbar bg-chat-panel">
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
          </div>
        ) : (
          <AnimatePresence>
            {contacts.map((c, i) => (
              <ContactRow key={c.email} contact={c} index={i} />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* New Chat Dialog */}
      {isNewChatOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsNewChatOpen(false)}
          />
          <div className="relative bg-chat-panel border border-chat-surface-alt rounded-lg shadow-xl w-[90%] max-w-md p-4">
            <h3 className="text-lg font-semibold mb-2">Start new chat</h3>
            <Input
              type="email"
              placeholder="Enter email address"
              value={newChatEmail}
              onChange={(e) => setNewChatEmail(e.target.value)}
              className="bg-chat-surface border-chat-surface-alt text-chat-text placeholder-chat-text-muted focus:border-chat-accent"
            />
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsNewChatOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-chat-accent text-white"
                onClick={startNewChat}
              >
                Start
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Sheet (view/update from search) */}
      {profileUser && <ProfileSheet initial={profileUser} />}

      {/* NEW: Own Profile Editor Sheet opened from three-dots menu */}
      {profileOpen && (
        <div className="absolute inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setProfileOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full w-full sm:w-[420px] bg-chat-panel border-l border-chat-surface-alt p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Edit Profile</h3>
              <button
                className="text-chat-text-muted hover:text-chat-text"
                onClick={() => setProfileOpen(false)}
                aria-label="Close"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-green-600 flex items-center justify-center text-white text-xl font-bold">
                {profileForm.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profileForm.avatar_url}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (user?.email?.slice(0, 2) || "??").toUpperCase()
                )}
              </div>

              <div>
                <p className="text-sm text-chat-text-muted mb-1">Name</p>
                <input
                  className="w-full bg-chat-surface border border-chat-surface-alt rounded px-3 py-2 outline-none focus:border-chat-accent"
                  value={profileForm.name}
                  onChange={(e) =>
                    setProfileForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </div>

              <div>
                <p className="text-sm text-chat-text-muted mb-1">About</p>
                <textarea
                  className="w-full bg-chat-surface border border-chat-surface-alt rounded px-3 py-2 outline-none focus:border-chat-accent"
                  value={profileForm.about}
                  onChange={(e) =>
                    setProfileForm((f) => ({ ...f, about: e.target.value }))
                  }
                />
              </div>

              <div>
                <p className="text-sm text-chat-text-muted mb-1">Avatar URL</p>
                <input
                  className="w-full bg-chat-surface border border-chat-surface-alt rounded px-3 py-2 outline-none focus:border-chat-accent"
                  placeholder="https://example.com/new.jpg"
                  value={profileForm.avatar_url}
                  onChange={(e) =>
                    setProfileForm((f) => ({
                      ...f,
                      avatar_url: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setProfileOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-chat-accent text-white"
                  onClick={handleSaveProfile}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>

              {/* Example response shape (for reference) */}
              {/* {
                   "user_email": "reciever@gmail.com",
                   "display_name": null,
                   "about": "Updated about info",
                   "avatar_url": "https://example.com/new.jpg",
                   "avatar_url": "https://example.com/new.jpg",
                   "name": "New Name",
                   "status": null,
                   "updated_at": "2025-09-06T20:40:40.410Z"
                 } */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
