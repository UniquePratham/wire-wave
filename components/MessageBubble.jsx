// components/MessageBubble.jsx
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, CheckCheck, Reply, Trash2 } from "lucide-react";
import { formatMessageTime, processMessageContent } from "../lib/messages";

export default function MessageBubble({ message, isOwn, onReply, onDelete }) {
  const [hover, setHover] = useState(false);

  const processedContent = useMemo(() => {
    return processMessageContent(String(message?.content ?? ""));
  }, [message?.content]);

  const formattedTime = useMemo(() => {
    return formatMessageTime(message?.sent_at);
  }, [message?.sent_at]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`group relative flex ${
        isOwn ? "justify-end" : "justify-start"
      } mb-2`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* hover toolbar */}
      {hover && (
        <div
          className={`absolute ${
            isOwn ? "-left-28" : "-right-28"
          } top-1/2 -translate-y-1/2 z-10 flex gap-2 bg-chat-panel border border-chat-surface-alt rounded-md px-2 py-1 shadow`}
        >
          <button
            className="text-chat-text-muted hover:text-chat-text flex items-center gap-1"
            title="Reply"
            onClick={(e) => {
              e.stopPropagation();
              onReply?.(message);
            }}
          >
            <Reply className="w-4 h-4" />
            <span className="text-xs">Reply</span>
          </button>
          <button
            className="text-red-400 hover:text-red-300 flex items-center gap-1"
            title="Delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(message);
            }}
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-xs">Delete</span>
          </button>
        </div>
      )}

      <div
        className={`message-bubble ${
          isOwn ? "message-bubble-sent" : "message-bubble-received"
        } max-w-xs lg:max-w-md`}
      >
        {/* Optional quoted parent (if message has quote info in future) */}

        {/* Content */}
        <div
          className="break-words"
          dangerouslySetInnerHTML={{ __html: processedContent }}
        />

        {/* Footer */}
        <div
          className={`flex items-center justify-end mt-1 space-x-1 ${
            isOwn ? "text-green-100" : "text-chat-text-muted"
          }`}
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
    </motion.div>
  );
}
