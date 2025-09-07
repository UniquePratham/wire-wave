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

  const handleLogout = async () => {
    await logoutUser();
    localStorage.removeItem("chatpulse_user");
  };

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

        <div className="h-full grid grid-cols-1 md:grid-cols-[320px_1fr]">
          {/* Sidebar (Desktop) */}
          <aside className="hidden md:flex flex-col h-full bg-chat-panel border-r border-chat-surface-alt">
            <div className="flex-1 min-h-0">
              <ContactList />
            </div>
            <div className="p-4 border-t border-chat-surface-alt">
              <Button
                onClick={handleLogout}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-150"
              >
                Logout
              </Button>
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
                className="md:hidden fixed left-0 top-0 h-full w-80 z-50 flex flex-col bg-chat-panel border-r border-chat-surface-alt"
              >
                <div className="flex-1 min-h-0">
                  <ContactList />
                </div>
                <div className="p-4 border-t border-chat-surface-alt">
                  <Button
                    onClick={handleLogout}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-150"
                  >
                    Logout
                  </Button>
                </div>
              </motion.aside>
            </>
          )}

          {/* Main Chat */}
          <main className="h-full min-h-0">
            <ChatWindow />
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
