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
import { getDisplayName, getAvatarColor } from "../lib/contacts";
import {
  fetchMessages,
  sendMessage,
  deleteMessage as apiDeleteMessage,
  markMessageAsRead,
  groupMessagesByDate,
} from "../lib/messages";
import apiClient from "../lib/axios";

const Picker = dynamic(async () => {
  const m = await import("emoji-mart");
  // emoji-mart may export the picker in different shapes:
  // - a React-compatible component (named Picker or default)
  // - a browser build that exposes a custom element class (em-emoji-picker)
  const Comp = m?.Picker ?? m?.default ?? m;

  // If the export is a custom element class (browser build), render the custom element tag
  // and apply incoming props as DOM properties (functions should be assigned directly).
  const looksLikeCustomElement =
    typeof Comp === "function" && Comp.prototype && typeof Comp.prototype.connectedCallback === "function";

  if (looksLikeCustomElement) {
    // Return a React wrapper that mounts the custom element and assigns props to it.
    // This wrapper also wires the pick event to call the onEmojiSelect/onSelect callbacks
    // so React receives the selected emoji.
    return function EmojiPickerCustomElementWrapper(props) {
      const containerRef = useRef(null);
      const elRef = useRef(null);

      useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Create the element imperatively so we can set properties BEFORE it connects
        let el = elRef.current;
        if (!el) {
          el = document.createElement('em-emoji-picker');
          elRef.current = el;

          // set initial props synchronously (functions and others)
          try {
            Object.keys(props || {}).forEach((key) => {
              try {
                el[key] = props[key];
              } catch (e) { }
            });
          } catch (e) { }

          // attach an event forwarder (we will rebind on props change)
          const makeHandler = (p) => (ev) => {
            const detail = ev && ev.detail ? ev.detail : ev;
            const payload = detail.emoji || detail.detail || detail;
            try {
              if (typeof p.onEmojiSelect === 'function') p.onEmojiSelect(payload);
              if (typeof p.onSelect === 'function') p.onSelect(payload);
            } catch (e) { }
          };

          const handler = makeHandler(props || {});
          el._picker_forward = handler;
          el.addEventListener('emoji-select', handler);
          el.addEventListener('select', handler);

          // delegated click handler to detect clicks on emoji nodes and forward a simple payload
          const clickHandler = (ev) => {
            try {
              const path = (ev.composedPath && ev.composedPath()) || ev.path || [];
              for (const node of path) {
                if (!node || node === el) continue;
                if (node.classList && node.classList.contains && node.classList.contains('emoji-mart-emoji')) {
                  const img = node.querySelector && node.querySelector('img');
                  const char = img ? (img.alt || img.getAttribute('alt') || img.getAttribute('data-emoji') || img.title) : (node.textContent && node.textContent.trim());
                  if (char) {
                    if (typeof props.onEmojiSelect === 'function') props.onEmojiSelect({ native: char });
                    if (typeof props.onSelect === 'function') props.onSelect({ native: char });
                    return;
                  }
                }
                if (node.tagName === 'IMG') {
                  const alt = node.alt || node.getAttribute('alt') || node.getAttribute('data-emoji');
                  if (alt) {
                    if (typeof props.onEmojiSelect === 'function') props.onEmojiSelect({ native: alt });
                    if (typeof props.onSelect === 'function') props.onSelect({ native: alt });
                    return;
                  }
                }
                if (node.getAttribute && node.getAttribute('data-emoji')) {
                  const d = node.getAttribute('data-emoji');
                  if (d) {
                    if (typeof props.onEmojiSelect === 'function') props.onEmojiSelect({ native: d });
                    if (typeof props.onSelect === 'function') props.onSelect({ native: d });
                    return;
                  }
                }
              }
            } catch (e) {
              // ignore
            }
          };
          el._picker_click = clickHandler;
          el.addEventListener('click', clickHandler, true);

          container.appendChild(el);
        } else {
          // element exists: update properties and rebind forwarder so it sees latest props
          try {
            Object.keys(props || {}).forEach((key) => {
              try {
                el[key] = props[key];
              } catch (e) { }
            });
          } catch (e) { }

          // rebind handler to capture latest props
          try {
            if (el._picker_forward) {
              el.removeEventListener('emoji-select', el._picker_forward);
              el.removeEventListener('select', el._picker_forward);
            }
            if (el._picker_click) {
              el.removeEventListener('click', el._picker_click, true);
            }
            const makeHandler = (p) => (ev) => {
              const detail = ev && ev.detail ? ev.detail : ev;
              const payload = detail.emoji || detail.detail || detail;
              try {
                if (typeof p.onEmojiSelect === 'function') p.onEmojiSelect(payload);
                if (typeof p.onSelect === 'function') p.onSelect(payload);
              } catch (e) { }
            };
            const handler = makeHandler(props || {});
            el._picker_forward = handler;
            el.addEventListener('emoji-select', handler);
            el.addEventListener('select', handler);
            // rebind click delegated handler
            const clickHandler = (ev) => {
              try {
                const path = (ev.composedPath && ev.composedPath()) || ev.path || [];
                for (const node of path) {
                  if (!node || node === el) continue;
                  if (node.classList && node.classList.contains && node.classList.contains('emoji-mart-emoji')) {
                    const img = node.querySelector && node.querySelector('img');
                    const char = img ? (img.alt || img.getAttribute('alt') || img.getAttribute('data-emoji') || img.title) : (node.textContent && node.textContent.trim());
                    if (char) {
                      if (typeof props.onEmojiSelect === 'function') props.onEmojiSelect({ native: char });
                      if (typeof props.onSelect === 'function') props.onSelect({ native: char });
                      return;
                    }
                  }
                  if (node.tagName === 'IMG') {
                    const alt = node.alt || node.getAttribute('alt') || node.getAttribute('data-emoji');
                    if (alt) {
                      if (typeof props.onEmojiSelect === 'function') props.onEmojiSelect({ native: alt });
                      if (typeof props.onSelect === 'function') props.onSelect({ native: alt });
                      return;
                    }
                  }
                  if (node.getAttribute && node.getAttribute('data-emoji')) {
                    const d = node.getAttribute('data-emoji');
                    if (d) {
                      if (typeof props.onEmojiSelect === 'function') props.onEmojiSelect({ native: d });
                      if (typeof props.onSelect === 'function') props.onSelect({ native: d });
                      return;
                    }
                  }
                }
              } catch (e) {
                // ignore
              }
            };
            el._picker_click = clickHandler;
            el.addEventListener('click', clickHandler, true);
          } catch (e) { }
        }

        return () => {
          try {
            const el = elRef.current;
            if (el) {
              if (el._picker_forward) {
                el.removeEventListener('emoji-select', el._picker_forward);
                el.removeEventListener('select', el._picker_forward);
              }
              if (el._picker_click) {
                el.removeEventListener('click', el._picker_click, true);
              }
              if (el.parentNode) el.parentNode.removeChild(el);
              elRef.current = null;
            }
          } catch (e) { }
        };
      }, [props]);

      return <div ref={containerRef} />;
    };
  }

  // Otherwise Comp is likely a React component (function/class). Wrap and return it.
  return function EmojiPickerWrapper(props) {
    return <Comp {...props} />;
  };
}, { ssr: false });

export default function ChatWindow() {
  const [messageText, setMessageText] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);

  const containerRef = useRef(null);
  const headerRef = useRef(null);
  const composerRef = useRef(null);

  const { activeContactEmail, typingUsers } = useUIStore((s) => ({
    activeContactEmail: s.activeContactEmail,
    typingUsers: s.typingUsers,
  }));
  const { user } = useAuthStore();
  // read messages from the chat store (safe default: [])
  const messages = useChatStore((s) => s.messages) || [];
  const contacts = useChatStore((s) => s.contacts);
  const messagesEndRefMobile = useRef(null);
  const messagesEndRefDesktop = useRef(null);
  const textareaRef = useRef(null);

  const insertAtCursor = (text) => {
    const ta = textareaRef.current;
    if (!ta) {
      setMessageText((t) => t + text);
      return;
    }
    const start = ta.selectionStart ?? ta.value.length;
    const end = ta.selectionEnd ?? ta.value.length;
    const value = ta.value;
    const newValue = value.slice(0, start) + text + value.slice(end);
    setMessageText(newValue);
    // set caret after inserted emoji
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + text.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  // autosize textarea: adjust height based on scrollHeight up to 5 lines, then allow internal scrolling
  const autosize = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    // compute line height from computed style (fallback 20)
    const style = window.getComputedStyle(ta);
    const lineHeight = parseFloat(style.lineHeight) || 20;
    const padding = parseFloat(style.paddingTop || 0) + parseFloat(style.paddingBottom || 0) || 8;
    const maxLines = 5;
    const maxHeight = Math.ceil(lineHeight * maxLines + padding);

    // reset to auto to measure content
    ta.style.height = 'auto';
    const needed = ta.scrollHeight;
    if (needed <= maxHeight) {
      ta.style.overflowY = 'hidden';
      ta.style.height = Math.max(needed, lineHeight + padding) + 'px';
    } else {
      ta.style.overflowY = 'auto';
      ta.style.height = maxHeight + 'px';
    }
  };

  useEffect(() => {
    autosize();
  }, [messageText]);

  // Measure header & composer heights and expose as CSS vars so the messages pane can be absolutely
  // positioned between them. This keeps the header and composer sticky and prevents the page
  // from scrolling unless messages overflow the available area.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const setVars = () => {
      const headerH = headerRef.current ? headerRef.current.offsetHeight : 0;
      const composerH = composerRef.current ? composerRef.current.offsetHeight : 0;
      el.style.setProperty('--chat-header-height', `${headerH}px`);
      el.style.setProperty('--chat-composer-height', `${composerH}px`);
      try {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--chat-left', `${Math.round(r.left)}px`);
        el.style.setProperty('--chat-width', `${Math.round(r.width)}px`);
      } catch (e) { }
    };

    // initial
    setVars();

    // update on resize and when fonts/layout changes
    window.addEventListener('resize', setVars);
    // If the virtual keyboard opens on mobile, viewport changes; also update on focus/blur
    window.addEventListener('orientationchange', setVars);

    // observe size changes to header/composer
    const ro = new ResizeObserver(setVars);
    if (headerRef.current) ro.observe(headerRef.current);
    if (composerRef.current) ro.observe(composerRef.current);

    return () => {
      window.removeEventListener('resize', setVars);
      window.removeEventListener('orientationchange', setVars);
      try {
        ro.disconnect();
      } catch (e) { }
    };
  }, [replyTo, messageText]);

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
        markMessageAsRead(m.id).catch(() => { });
      }
    });

    scrollToBottom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeContactEmail, conversationMessages]);

  const scrollToBottom = () => {
    try {
      messagesEndRefMobile.current?.scrollIntoView({ behavior: "smooth" });
    } catch (e) { }
    try {
      messagesEndRefDesktop.current?.scrollIntoView({ behavior: "smooth" });
    } catch (e) { }
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
    <div ref={containerRef} className="min-h-screen h-full relative bg-chat-bg overflow-hidden md:grid md:grid-rows-[auto_1fr_auto]" style={{ '--chat-header-height': '56px', '--chat-composer-height': '72px' }}>
      {/* Header (sticky) */}
      <div ref={headerRef} className="bg-chat-panel border-b border-chat-surface-alt px-4 py-3 flex justify-between items-center sticky top-0 z-40 md:static" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium ${getAvatarColor(activeContactEmail)}`}>
            {(contacts.find(c => c.email === activeContactEmail)?.name || getDisplayName(activeContactEmail)).slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h2 className="font-medium text-chat-text truncate">{contacts.find(c => c.email === activeContactEmail)?.name || getDisplayName(activeContactEmail)}</h2>
            <p className="text-sm text-chat-text-muted truncate">{activeContactEmail}</p>
          </div>
        </div>
        <div className="flex gap-1 relative">
          <Button size="sm" variant="ghost" disabled><Phone className="w-4 h-4" /></Button>
          <Button size="sm" variant="ghost" disabled><Video className="w-4 h-4" /></Button>
          <Button size="sm" variant="ghost" onClick={() => setShowMenu((v) => !v)}>
            <MoreVertical className="w-4 h-4" />
          </Button>
          {showMenu && (
            <div className="absolute right-0 mt-10 w-40 bg-chat-panel border border-chat-surface-alt rounded-md shadow-lg z-50">
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

      {/* Mobile messages area (absolute between header and composer) */}
      <div
        className="block md:hidden absolute left-0 right-0 overflow-y-auto chat-scrollbar p-4 space-y-4"
        style={{ top: 'var(--chat-header-height)', bottom: 'var(--chat-composer-height)' }}
      >
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
        <div ref={messagesEndRefMobile} />
      </div>

      {/* Desktop messages area (static inside grid) */}
      <div className="hidden md:block min-h-0 overflow-y-auto chat-scrollbar p-4 space-y-4" style={{ paddingBottom: 'var(--chat-composer-height)' }}>
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
        <div ref={messagesEndRefDesktop} />
      </div>

      {/* Composer: fixed to bottom on small/mobile view; measured by ResizeObserver to set CSS var */}
      <div
        ref={composerRef}
        className="bg-chat-panel border-t border-chat-surface-alt px-3 py-3 fixed bottom-0 z-40 md:static"
        style={{ left: 'var(--chat-left, 0px)', width: 'var(--chat-width, 100%)' }}
      >
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
                <div className="absolute bottom-12 right-0 z-[9999]">
                  <Picker
                    theme="dark"
                    onEmojiSelect={(e) => {
                      const emoji = e.native || e.colons || e.sku || "";
                      insertAtCursor(emoji);
                    }}
                    onSelect={(e) => {
                      // some versions use onSelect instead
                      const emoji = e.native || e.colons || e.sku || "";
                      insertAtCursor(emoji);
                    }}
                  />
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
