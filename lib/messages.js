// lib/messages.js
import apiClient, { handleApiError, createRateLimiter } from "./axios";
import { useChatStore, useUIStore } from "./store";
import DOMPurify from "dompurify";

// Local rate limit: max 10 sends / min
const sendMessageRateLimit = createRateLimiter(10, 60000);

// Fetch all messages for authenticated user
export const fetchMessages = async () => {
  try {
    const res = await apiClient.get("/messages");
    const messages = Array.isArray(res.data) ? res.data : [];

    // Sanitize for display hygiene on client; on server, skip transform
    const sanitized = messages.map((m) => ({
      ...m,
      content:
        typeof window !== "undefined"
          ? DOMPurify.sanitize(String(m.content ?? ""))
          : String(m.content ?? ""),
    }));

    const { setMessages } = useChatStore.getState();
    setMessages(sanitized);
    return sanitized;
  } catch (err) {
    handleApiError(err, "Failed to fetch messages.");
    throw err;
  }
};

// Send a message
export const sendMessage = async (receiverEmail, content) => {
  try {
    sendMessageRateLimit();

    const raw = String(content ?? "").trim();
    if (!raw) throw new Error("Message content cannot be empty.");
    if (raw.length > 2000)
      throw new Error("Message is too long (max 2000 characters).");

    // Sanitize outbound on client; server should still validate
    const sanitizedContent =
      typeof window !== "undefined" ? DOMPurify.sanitize(raw) : raw;

    const res = await apiClient.post("/messages", {
      receiver_email: receiverEmail,
      content: sanitizedContent,
    });

    const newMessage = res.data;

    // Sync Zustand mirror for other consumers
    const { addMessage } = useChatStore.getState();
    addMessage({ ...newMessage, content: sanitizedContent });

    const { addToast } = useUIStore.getState();
    addToast({
      type: "success",
      title: "Message Sent",
      message: "Delivered to server.",
    });

    return newMessage;
  } catch (err) {
    if (String(err?.message || "").includes("Too many requests")) {
      const { addToast } = useUIStore.getState();
      addToast({
        type: "error",
        title: "Rate Limit",
        message: "Please wait a moment before sending another message.",
      });
    } else {
      handleApiError(err, "Failed to send message.");
    }
    throw err;
  }
};

// Correct mark-as-read: POST /messages/read with { message_id }
export const markMessageAsRead = async (messageId) => {
  try {
    const res = await apiClient.post("/messages/read", {
      message_id: messageId,
    });
    const { updateMessage } = useChatStore.getState();
    updateMessage(messageId, { read: true });
    return res.data;
  } catch (err) {
    console.warn("Failed to mark message as read:", err);
    throw err;
  }
};

export const deleteMessage = async (messageId) => {
  try {
    const res = await apiClient.delete(`/messages/${messageId}`);
    const { setMessages } = useChatStore.getState();
    setMessages((prev) =>
      Array.isArray(prev) ? prev.filter((m) => m.id !== messageId) : []
    );
    return res.data;
  } catch (err) {
    handleApiError(err, "Failed to delete message.");
    throw err;
  }
};

// Display utilities
export const formatMessageTime = (ts) => {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

export const formatMessageDate = (ts) => {
  const date = new Date(ts);
  const now = new Date();
  const days = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return date.toLocaleDateString("en-US", { weekday: "long" });
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export const groupMessagesByDate = (messages) => {
  const groups = {};
  (messages || []).forEach((m) => {
    const key = formatMessageDate(m.sent_at);
    groups[key] = groups[key] || [];
    groups[key].push(m);
  });
  return groups;
};

// Safe linkify + sanitize for rendering with dangerouslySetInnerHTML
export const processMessageContent = (content) => {
  const raw = String(content ?? "");
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const linked = raw.replace(
    urlRegex,
    (u) =>
      `<a href="${u}" target="_blank" rel="noopener noreferrer" class="text-chat-secondary hover:underline">${u}</a>`
  );
  // Only sanitize in the browser; on server just return linked
  return typeof window !== "undefined" ? DOMPurify.sanitize(linked) : linked;
};

// Optional polling helpers
let fetchTimeout = null;
export const debouncedFetchMessages = (delay = 1500) => {
  if (fetchTimeout) clearTimeout(fetchTimeout);
  fetchTimeout = setTimeout(() => {
    fetchMessages();
  }, delay);
};
export const stopDebouncedFetching = () => {
  if (fetchTimeout) {
    clearTimeout(fetchTimeout);
    fetchTimeout = null;
  }
};
