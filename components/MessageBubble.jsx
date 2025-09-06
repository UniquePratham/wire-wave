import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, CheckCheck } from 'lucide-react';
import DOMPurify from 'dompurify';

import { formatMessageTime, processMessageContent } from '../lib/messages';

export default function MessageBubble({ message, isOwn }) {
  // Process message content safely
  const processedContent = useMemo(() => {
    return processMessageContent(message.content);
  }, [message.content]);

  // Format timestamp
  const formattedTime = useMemo(() => {
    return formatMessageTime(message.sent_at);
  }, [message.sent_at]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}
    >
      <div
        className={`message-bubble ${
          isOwn ? 'message-bubble-sent' : 'message-bubble-received'
        } max-w-xs lg:max-w-md`}
      >
        {/* Message Content */}
        <div 
          className="break-words"
          dangerouslySetInnerHTML={{ __html: processedContent }}
        />

        {/* Message Footer */}
        <div className={`flex items-center justify-end mt-1 space-x-1 ${
          isOwn ? 'text-green-100' : 'text-chat-text-muted'
        }`}>
          <span className="text-xs opacity-75">{formattedTime}</span>
          
          {/* Read Receipts for sent messages */}
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