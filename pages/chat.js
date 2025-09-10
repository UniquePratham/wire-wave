// pages/chat.jsx
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import ProtectedRoute from "../components/ProtectedRoute.jsx";
import ContactList from "../components/ContactList";
import ChatWindow from "../components/ChatWindow";
import { useUIStore } from "../lib/store";
import { Button } from "../src/components/ui/button";
import { logoutUser } from "../lib/auth";

export default function ChatPage() {
  const { isMobileMenuOpen, setMobileMenuOpen } = useUIStore();

  // Close mobile menu on desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setMobileMenuOpen]);

  return (
    <ProtectedRoute>
      <div className="h-screen w-screen overflow-hidden bg-chat-bg text-chat-text">
        {/* Mobile Menu Button */}
        <div className="md:hidden fixed top-4 left-4 z-50">
          <Button
            onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
            className="bg-chat-panel border border-chat-surface-alt text-chat-text hover:bg-chat-surface p-2"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </Button>
        </div>

        {/* Responsive grid: widen sidebar on larger screens */}
        <div
          className="
          h-full grid grid-cols-1
          md:grid-cols-[360px_1fr]
          lg:grid-cols-[400px_1fr]
          xl:grid-cols-[448px_1fr]
        "
        >
          {/* Sidebar (Desktop) */}
          <aside className="hidden md:flex flex-col h-full bg-chat-panel border-r border-chat-surface-alt">
            {/* Independent scroll region for the sidebar */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <ContactList />
            </div>
          </aside>

          {/* Mobile Drawer */}
          {isMobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileMenuOpen(false)}
                className="md:hidden fixed inset-0 bg-black/50 z-40"
              />
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="
                  md:hidden fixed left-0 top-0 h-full z-50 flex flex-col
                  bg-chat-panel border-r border-chat-surface-alt
                  w-[85vw] max-w-sm
                "
              >
                {/* Independent scroll region for mobile sidebar */}
                <div className="flex-1 min-h-0 overflow-y-auto">
                  <ContactList />
                </div>
                {/* Removed bottom Logout button; use the three-dot menu in ContactList */}
              </motion.aside>
            </>
          )}

          {/* Main Chat (independent scroll) */}
          <main className="h-full min-h-0 overflow-hidden">
            <ChatWindow />
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
