# ChatPulse - WhatsApp-style Messaging App TODO

## MVP Implementation Plan

### 1. Project Setup & Configuration
- [x] Template copied and dependencies installed
- [ ] Update package.json with required dependencies
- [ ] Configure Next.js for Pages Router (JavaScript only)
- [ ] Setup Tailwind CSS with custom theme colors
- [ ] Create environment configuration

### 2. Core Dependencies to Add
- [ ] Next.js pages router setup
- [ ] Framer Motion for animations
- [ ] React Query (TanStack Query) for data fetching
- [ ] Zustand for state management
- [ ] Axios for HTTP requests
- [ ] Socket.io-client for real-time messaging
- [ ] React Hook Form + Zod for form validation
- [ ] Date-fns for date handling
- [ ] DOMPurify for content sanitization
- [ ] Lucide React for icons

### 3. Project Structure
```
/pages
├── _app.js (providers wrapper)
├── _document.js (CSP headers)
├── index.js (redirect logic)
├── login.js
├── register.js
├── chat.js (main messaging interface)
├── contacts.js
├── profile.js
└── /api/auth
    ├── set-cookie.js
    └── clear-cookie.js

/components
├── Navbar.jsx
├── Alert.jsx
├── ContactList.jsx
├── ChatWindow.jsx
├── MessageBubble.jsx
├── LoadingSkeleton.jsx
├── ProviderShell.jsx
└── ProtectedRoute.jsx

/lib
├── axios.js (configured instance)
├── auth.js (auth helpers)
├── messages.js (message helpers)
├── contacts.js (contact helpers)
├── store.js (Zustand stores)
└── socket.js (socket.io setup)

/styles
├── globals.css
└── tailwind.css

/config
└── csp.js
```

### 4. Backend Integration (http://65.20.91.194:3000)
- [ ] POST /register
- [ ] POST /login  
- [ ] POST /messages
- [ ] GET /messages
- [ ] POST /messages/:message_id/read

### 5. Core Features Implementation
- [ ] Authentication system with JWT + secure cookies
- [ ] Real-time messaging with WebSocket + polling fallback
- [ ] Contact list with search and filtering
- [ ] Chat interface with message bubbles
- [ ] Read receipts and message status
- [ ] Responsive 2-pane layout (desktop) / single pane (mobile)

### 6. Security Features
- [ ] XSS prevention with DOMPurify
- [ ] Secure cookie storage (SameSite=Strict)
- [ ] CSP headers
- [ ] Input validation with Zod
- [ ] Rate limiting on UI level

### 7. UI/UX Features
- [ ] WhatsApp-style dark theme
- [ ] Smooth animations with Framer Motion
- [ ] Mobile-responsive design
- [ ] Loading skeletons
- [ ] Toast notifications
- [ ] Typing indicators
- [ ] Online presence dots

### 8. Files to Create (8 total - within limit)
1. pages/_app.js - Main app wrapper with providers
2. pages/chat.js - Main messaging interface
3. components/ChatWindow.jsx - Chat interface component
4. components/ContactList.jsx - Contact list component
5. lib/store.js - Zustand state management
6. lib/axios.js - HTTP client configuration
7. lib/socket.js - WebSocket client setup
8. README.md - Complete documentation

This represents the core MVP functionality focusing on the most essential features for a working messaging application.