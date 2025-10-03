// components/MessageBubble.jsx
import { useMemo, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Check, CheckCheck, Reply, Trash2 } from "lucide-react";
import { formatMessageTime, processMessageContent } from "../lib/messages";

export default function MessageBubble({ message, isOwn, onReply, onDelete }) {
  const [hover, setHover] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const rootRef = useRef(null);

  const processedContent = useMemo(() => {
    return processMessageContent(String(message?.content ?? ""));
  }, [message?.content]);

  const formattedTime = useMemo(() => {
    return formatMessageTime(message?.sent_at);
  }, [message?.sent_at]);

  // close menu when clicking outside or pressing Escape
  useEffect(() => {
    function onDocClick(e) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }

    function onKey(e) {
      if (e.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("touchstart", onDocClick);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("touchstart", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    // detect touch-capable devices to disable contextmenu behavior
    if (typeof window !== "undefined") {
      const touch = navigator.maxTouchPoints > 0 || window.matchMedia?.("(hover: none)").matches;
      setIsTouchDevice(Boolean(touch));
    }
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`group relative flex ${isOwn ? "justify-end" : "justify-start"} mb-2`}
      ref={rootRef}
      onContextMenu={(e) => {
        // Desktop: open vertical menu on right-click. On touch devices ignore.
        if (isTouchDevice) return;
        e.preventDefault();
        const x = e.clientX;
        const y = e.clientY;
        // clamp to viewport
        const left = Math.min(x, window.innerWidth - 220);
        const top = Math.min(y, window.innerHeight - 120);
        setMenuPos({ x: left, y: top });
        setMenuOpen(true);
      }}
      onClick={(e) => {
        // On touch devices, allow tap to open the menu near the bubble
        if (!isTouchDevice) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const left = Math.min(rect.left + rect.width / 2, window.innerWidth - 220);
        const top = Math.max(rect.top + window.scrollY - 120, 8);
        setMenuPos({ x: left, y: top });
        setMenuOpen(true);
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* hover toolbar (rendered inside bubble and placed above the message to avoid horizontal overflow) */}

      {/* Message bubble */}
      <div
        className={`message-bubble ${isOwn ? "message-bubble-sent pr-14" : "message-bubble-received pl-14"} max-w-xs lg:max-w-md relative`}
      >
        {/* Optional quoted parent (if message has quote info in future) */}

        {/* Content */}
        <div
          className="break-words"
          dangerouslySetInnerHTML={{ __html: processedContent }}
        />

        {/* Footer */}
        <div
          className={`flex items-center justify-end mt-1 space-x-1 ${isOwn ? "text-green-100" : "text-chat-text-muted"}`}
        >
          <span className="text-xs opacity-75">{formattedTime}</span>
          {isOwn && (
            <div className="flex items-center">
              {message.read ? (
                <CheckCheck className="w-3 h-3 text-blue-400" />
              ) : (
                <Check className="w-3 h-3 opacity-75" />
              )}
            </div>
          )}
        </div>
      </div>
      {/* Vertical context menu (fixed) shown on right-click (desktop) or tap (touch) */}
      {menuOpen && typeof document !== "undefined" && createPortal(
        <div
          className="fixed bg-chat-panel border border-chat-surface-alt rounded-md shadow-lg overflow-hidden"
          style={{ left: menuPos.x, top: menuPos.y, minWidth: 180, zIndex: 999999 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full text-left px-4 py-2 hover:bg-chat-surface flex items-center gap-2"
            onClick={(e) => {
              e.stopPropagation();
              onReply?.(message);
              setMenuOpen(false);
            }}
          >
            <Reply className="w-4 h-4" />
            Reply
          </button>
          <button
            className="w-full text-left px-4 py-2 hover:bg-chat-surface flex items-center gap-2"
            onClick={async (e) => {
              e.stopPropagation();
              try {
                await navigator.clipboard.writeText(String(message?.content ?? ""));
              } catch (err) {
                const el = document.createElement('textarea');
                el.value = String(message?.content ?? "");
                document.body.appendChild(el);
                el.select();
                document.execCommand('copy');
                document.body.removeChild(el);
              }
              setMenuOpen(false);
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16h8M8 12h8M8 8h8" /></svg>
            Copy
          </button>
          <button
            className="w-full text-left px-4 py-2 hover:bg-chat-surface text-red-400 flex items-center gap-2"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(message.id ?? message);
              setMenuOpen(false);
            }}
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>,
        document.body
      )}
    </motion.div>
  );
}
