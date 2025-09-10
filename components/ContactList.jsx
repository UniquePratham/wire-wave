// components/ContactList.jsx
import { useState, useEffect } from "react";
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
  UserX,
  UserCircle2,
} from "lucide-react";
import { useUIStore, useAuthStore, useChatStore } from "../lib/store";
import { clearAllMessages, fetchMessages } from "../lib/messages"; // ✅ fix path if needed
import { Input } from "../src/components/ui/input";
import { Button } from "../src/components/ui/button";
import { Badge } from "../src/components/ui/badge";
import { logoutUser } from "../lib/auth";
import Image from "next/image";
import { createProfile, updateProfile, searchProfile, selfProfile } from "../lib/profile";

export default function ContactList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [emailQuery, setEmailQuery] = useState("");
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [newChatEmail, setNewChatEmail] = useState("");
  const [profileUser, setProfileUser] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ user_email: "", name: "", about: "", avatar_url: "" });
  const [saving, setSaving] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnimation, setIsAnimation] = useState(false);
  const [profile, setProfile] = useState({});

  const user = useAuthStore((s) => s.user);
  const contacts = useChatStore((s) => s.contacts);
  const setContacts = useChatStore((s) => s.setContacts);
  const activeContactEmail = useUIStore((s) => s.activeContactEmail);
  const setActiveContact = useUIStore((s) => s.setActiveContact);

  // ✅ fetch messages properly
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!user) return;
      try {
        const msgs = await fetchMessages(); // <- call it
        if (!mounted) return;
        if (Array.isArray(msgs) && msgs.length) {
          const mapped = await buildContacts(msgs, user);
          setContacts(mapped);
        } else {
          // if there are no messages, ensure contacts are empty or preserved
          setContacts([]);
        }
      } catch (err) {
        // ignore or add a toast
      }
    };
    load();
    return () => { mounted = false; };
  }, [user, setContacts]);

  const buildContacts = async (messages, user) => {
    const map = new Map();

    for (const m of messages) {
      const contactEmail =
        m.sender_email === user?.email ? m.receiver_email : m.sender_email;

      if (!map.has(contactEmail)) {
        map.set(contactEmail, {
          email: contactEmail,
          lastMessage: m.content || "",
          lastMessageTime: m.sent_at,
          unreadCount: 0,
        });
      }

      const contact = map.get(contactEmail);

      if (new Date(m.sent_at) > new Date(contact.lastMessageTime)) {
        contact.lastMessage = m.content || "";
        contact.lastMessageTime = m.sent_at;
      }

      if (m.sender_email === contactEmail && !m.read) {
        contact.unreadCount += 1;
      }
    }

    // 🔥 Fetch profiles in parallel
    const contacts = Array.from(map.values());
    const withProfiles = await Promise.all(
      contacts.map(async (c) => {
        try {
          const res = await searchProfile(c.email);
          return {
            ...c,
            name: res.data?.name || "",
            avatar_url: res.data?.avatar_url || "",
          };
        } catch {
          return { ...c };
        }
      })
    );

    return withProfiles.sort(
      (a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
    );
  };

  const handleFindByEmail = async () => {
    const email = emailQuery.trim();
    if (!email) return;
    try {
      const res = await searchProfile(email);
      setProfileUser(
        res.data?.user_email ? res.data : { user_email: email, error: "User not found" }
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
  };

  const openProfile = async (email) => {
    try {
      const res = await searchProfile(email);
      setProfileUser(res.data?.user_email ? res.data : { user_email: email });
    } catch {
      setProfileUser({ user_email: email });
    }
  };

  const clearChat = async (email) => {
    try {
      // reload messages after clear
      clearAllMessages(email);
      const msgs = await fetchMessages();
      const mapped = buildContacts(msgs, user);
      setContacts(mapped);
    } catch (err) {
      console.error("Failed to clear chat:", err);
    }
  };

  const onLogout = async () => {
    setMoreOpen(false);
    await logoutUser();
  };

  const handleOpenOwnProfile = async () => {
    setMoreOpen(false);
    try {
      const res = await selfProfile();
      setProfileForm({
        user_email: user?.email || "",
        name: res.data?.name || "",
        about: res.data?.about || "",
        avatar_url: res.data?.avatar_url || "",
      });
    } catch {
      setProfileForm({ user_email: "", name: "", about: "", avatar_url: "" });
    }
    setProfileOpen(true);
  };


  const ProfileModal = ({ initial, editable = false, onClose }) => {
    const [form, setForm] = useState({
      user_email: initial.user_email || initial.email || "",
      name: initial.name || "",
      about: initial.about || "",
      avatar_url: initial.avatar_url || "",
    });
    const handleChange = (e) => {
      const { name, value } = e.target;
      setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSaveProfile = async () => {
      console.log("Saving profile:", form);
      setSaving(true);
      try {
        await updateProfile(form);
        setProfileOpen(false);
        if (onClose) onClose();
      } catch (err) {
        if (err?.response?.status === 404) {
          await createProfile(form);
          setProfileOpen(false);
        } else {
          console.error("Profile save failed", err);
        }
        if (onClose) onClose();
      } finally {
        setSaving(false);
        if (onClose) onClose();
      }
    };


    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => setProfileUser(null)}
        />
        <div className="relative w-full max-w-md bg-chat-panel border border-chat-surface-alt rounded-2xl shadow-2xl z-10 p-6">
          <h3 className="text-xl font-semibold mb-4">
            {editable ? "Your Profile" : "User Profile"}
          </h3>

          {initial.error ? (
            <div className="flex justify-left items-center gap-2 text-red-500">
              <UserX className="w-6 h-6 text-red-500" />
              <p className="text-red-400">{initial.error}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-green-600 flex items-center justify-center text-white text-2xl font-bold mx-auto shadow-md">
                {form.avatar_url ? (
                  <img src={form.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  (initial.name?.slice(0, 2) || initial.user_email?.slice(0, 2) || "??").toUpperCase()
                )}
              </div>

              <div className="text-center">
                <p className="text-sm text-chat-text-muted">Email</p>
                <p className="font-medium">{initial.user_email || initial.email}</p>
              </div>

              <div>
                <p className="text-sm text-chat-text-muted mb-1">Name</p>
                {editable ? (
                  <input
                    className="w-full bg-chat-surface border border-chat-surface-alt rounded px-3 py-2"
                    value={form.name}
                    onChange={handleChange}
                    name="name"
                  />
                ) : (
                  <p className="px-3 py-2 bg-chat-surface rounded">{form.name || "No Name provided"}</p>
                )}
              </div>

              <div>
                <p className="text-sm text-chat-text-muted mb-1">About</p>
                {editable ? (
                  <textarea
                    className="w-full bg-chat-surface border border-chat-surface-alt rounded px-3 py-2"
                    value={form.about}
                    onChange={handleChange}
                    name="about"
                  />
                ) : (
                  <p className="px-3 py-2 bg-chat-surface rounded min-h-[40px]">
                    {form.about || "No description provided"}
                  </p>
                )}
              </div>

              {editable && (
                <div>
                  <p className="text-sm text-chat-text-muted mb-1">Avatar URL</p>
                  <input
                    className="w-full bg-chat-surface border border-chat-surface-alt rounded px-3 py-2"
                    value={form.avatar_url}
                    onChange={handleChange}
                    name="avatar_url"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={onClose}>
                  Close
                </Button>
                {editable && (
                  <Button
                    className="bg-chat-accent text-white"
                    onClick={handleSaveProfile}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save"}
                  </Button>
                )}
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
      {/* Avatar button */}
      <div className="relative">
        <button
          className="w-12 h-12 rounded-full overflow-hidden bg-green-600 flex items-center justify-center text-white font-medium"
          onClick={(e) => {
            e.stopPropagation(); // prevent switching chat
            openProfile(contact.email);
          }}
        >
          {contact.avatar_url ? (
            <img
              src={contact.avatar_url}
              alt="avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            (contact.name?.slice(0, 2) ||
              contact.email?.slice(0, 2) ||
              "??"
            ).toUpperCase()
          )}
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          {/* Name button */}
          <button
            className="font-medium text-chat-text truncate text-left hover:underline"
            onClick={(e) => {
              e.stopPropagation(); // prevent switching chat
              openProfile(contact.email);
            }}
            title={contact.email}
          >
            {contact.name ? contact.name : contact.email}
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
          <p>
            {typeof contact.lastMessage === "string"
              ? contact.lastMessage
              : contact.lastMessage?.content || "No messages yet"}
          </p>

          {contact.unreadCount > 0 && (
            <Badge className="bg-chat-accent text-white text-xs ml-2 min-w-[20px] h-5 flex items-center justify-center">
              {contact.unreadCount > 99 ? "99+" : contact.unreadCount}
            </Badge>
          )}

          {/* Dropdown menu */}
          <div className="relative ml-2">
            <button
              className="p-1 text-chat-text-muted hover:text-chat-text"
              onClick={(e) => {
                e.stopPropagation(); // prevent switching chat
                setOpen((v) => !v);
              }}
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {open && (
              <div className="absolute right-0 mt-2 w-40 bg-chat-panel border border-chat-surface-alt rounded-md shadow-lg z-30">
                <button className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-chat-surface">
                  <BellOff className="w-4 h-4" />
                  Mute (soon)
                </button>
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-chat-surface"
                  onClick={(e) => {
                    e.stopPropagation();
                    openProfile(contact.email);
                  }}
                >
                  <User2 className="w-4 h-4" />
                  View profile
                </button>
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-red-400 hover:bg-chat-surface"
                  onClick={(e) => {
                    e.stopPropagation();
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
        <div className="flex flex-col gap-3">
          {/* Row 1: Email lookup */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-chat-text-muted w-4 h-4" />
              <Input
                type="email"
                placeholder="Search by email..."
                value={emailQuery}
                onChange={(e) => setEmailQuery(e.target.value)}
                className="pl-10 bg-chat-surface border-chat-surface-alt text-chat-text"
              />
            </div>
            <Button
              onClick={handleFindByEmail}
              className="bg-chat-accent text-white hover:opacity-90"
            >
              <LocateFixed className="w-4 h-4" />
            </Button>
          </div>

          {/* Row 2: Conversations search + actions */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-chat-text-muted w-4 h-4" />
              <Input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-chat-surface border-chat-surface-alt text-chat-text"
              />
            </div>
            <Button onClick={openNewChat} className="bg-chat-accent text-white">
              <Plus className="w-4 h-4" />
            </Button>
            <div className="relative">
              <Button
                variant="ghost"
                className="text-chat-text-muted hover:text-chat-text"
                onClick={() => setMoreOpen((v) => !v)}
              >
                <MoreVertical className="w-5 h-5" />
              </Button>
              {moreOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-chat-panel border border-chat-surface-alt rounded-md shadow-lg z-40">
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-chat-surface"
                    onClick={handleOpenOwnProfile}
                  >
                    <UserCircle2 className="w-4 h-4" />
                    Profile
                  </button>
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-chat-surface"
                    onClick={openNewChat}
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
      </div>

      {/* Scrollable list */}
      <div className="flex-1 min-h-0 overflow-y-auto chat-scrollbar bg-chat-panel">
        {contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-16 h-16 bg-chat-surface rounded-full flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8 text-chat-text-muted" />
            </div>
            <h3 className="text-chat-text font-medium mb-2">No conversations yet</h3>
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
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsNewChatOpen(false)} />
          <div className="relative bg-chat-panel border border-chat-surface-alt rounded-lg shadow-xl w-[90%] max-w-md p-4">
            <h3 className="text-lg font-semibold mb-2">Start new chat</h3>
            <Input
              type="email"
              placeholder="Enter email address"
              value={newChatEmail}
              onChange={(e) => setNewChatEmail(e.target.value)}
              className="bg-chat-surface border-chat-surface-alt text-chat-text"
            />
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsNewChatOpen(false)}>
                Cancel
              </Button>
              <Button className="bg-chat-accent text-white" onClick={startNewChat}>
                Start
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal (view or edit) */}
      {profileUser && (
        <ProfileModal
          initial={profileUser}
          onClose={() => setProfileUser(null)}
        />
      )}
      {profileOpen && (
        <ProfileModal
          initial={profileForm}
          editable
          onClose={() => setProfileOpen(false)}
        />
      )}

    </div>
  );
}
