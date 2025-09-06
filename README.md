# ChatPulse - Premium WhatsApp-Style Messaging App

A modern, real-time messaging application built with Next.js, featuring WhatsApp-style UI, secure authentication, and seamless real-time communication.

## ✨ Features

- **Real-time Messaging**: WebSocket-powered instant messaging with polling fallback
- **WhatsApp-Style UI**: Beautiful, responsive interface with dark theme
- **Secure Authentication**: JWT-based auth with secure cookie storage
- **Message Status**: Read receipts and delivery confirmations
- **Typing Indicators**: See when contacts are typing
- **Online Presence**: Real-time online/offline status
- **Mobile Responsive**: Optimized for all device sizes
- **Smooth Animations**: Framer Motion powered transitions
- **Message Search**: Find messages quickly
- **Contact Management**: Automatic contact discovery from conversations

## 🛠 Tech Stack

### Frontend
- **Next.js 15** - React framework with Pages Router
- **React 19** - UI library
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality UI components
- **Framer Motion** - Animation library
- **React Query** - Data fetching and caching
- **Zustand** - State management
- **React Hook Form + Zod** - Form handling and validation

### Backend Integration
- **Axios** - HTTP client with interceptors
- **Socket.io Client** - WebSocket communication
- **DOMPurify** - XSS protection
- **Date-fns** - Date utilities

## 🔒 Security Features

- **XSS Prevention**: Content sanitization with DOMPurify
- **CSRF Protection**: SameSite=Strict cookies
- **Content Security Policy**: Strict CSP headers
- **Input Validation**: Zod schema validation
- **Rate Limiting**: Client-side request throttling
- **Secure Cookie Storage**: HttpOnly, Secure cookies for JWT

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd chatpulse
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

4. Configure your environment variables in `.env.local`:
```env
NEXT_PUBLIC_BACKEND_URL=http://65.20.91.194:3000
NEXT_PUBLIC_WS_URL=ws://65.20.91.194:3000
NEXT_PUBLIC_APP_NAME=ChatPulse
COOKIE_NAME=chatpulse_auth
COOKIE_SECRET=your-super-secret-cookie-key-change-in-production
NODE_ENV=development
```

### Development

Start the development server:
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production

Build and start the production server:
```bash
pnpm build
pnpm start
```

## 📡 Backend API Endpoints

The application integrates with the following backend endpoints:

### Authentication
```bash
# Register new user
POST /register
Content-Type: application/json
Body: {"email":"user@example.com","password":"password123"}
Response: {"id":1,"email":"user@example.com","role":"user"}

# Login user
POST /login  
Content-Type: application/json
Body: {"email":"user@example.com","password":"password123"}
Response: {"token":"<JWT_TOKEN>"}
```

### Messages
```bash
# Send message
POST /messages
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
Body: {"receiver_email":"recipient@example.com","content":"Hello!"}
Response: {"id":1,"sender_email":"user@example.com","receiver_email":"recipient@example.com","content":"Hello!","read":false,"sent_at":"2025-09-05T13:07:31.071Z"}

# Get all messages
GET /messages
Authorization: Bearer <JWT_TOKEN>
Response: [Array of message objects]

# Mark message as read
POST /messages/:message_id/read
Authorization: Bearer <JWT_TOKEN>
Response: Updated message object with read: true
```

## 📁 Project Structure

```
/
├── pages/                 # Next.js pages
│   ├── _app.js           # App wrapper with providers
│   ├── _document.js      # Document with CSP headers
│   ├── index.js          # Home redirect
│   ├── login.js          # Login page
│   ├── register.js       # Registration page
│   ├── chat.js           # Main chat interface
│   ├── profile.js        # User profile
│   └── api/auth/         # Auth API routes
├── components/           # React components
│   ├── ContactList.jsx   # Contact sidebar
│   ├── ChatWindow.jsx    # Main chat interface
│   ├── MessageBubble.jsx # Individual message
│   └── ProtectedRoute.jsx# Auth guard
├── lib/                  # Utility libraries
│   ├── store.js          # Zustand state management
│   ├── axios.js          # HTTP client setup
│   ├── socket.js         # WebSocket client
│   ├── auth.js           # Authentication helpers
│   ├── messages.js       # Message utilities
│   └── contacts.js       # Contact management
├── styles/               # CSS styles
│   └── globals.css       # Global styles & theme
└── public/               # Static assets
```

## 🔄 How Live Updates Work

ChatPulse uses a hybrid approach for real-time updates:

1. **Primary**: WebSocket connection via Socket.io
   - Instant message delivery
   - Typing indicators
   - Online presence
   - Read receipts

2. **Fallback**: HTTP polling with React Query
   - Activates when WebSocket fails
   - 1.5-2.5 second intervals
   - Exponential backoff when idle
   - Revalidation on window focus

## 🐛 Troubleshooting

### Common Issues

**401 Unauthorized Errors**
- Check if JWT token is valid
- Verify backend API is running
- Clear cookies and re-login

**CORS Issues**
- Ensure backend allows requests from your domain
- Check CORS headers in backend configuration

**Socket Connection Failed**
- Verify WebSocket URL in environment variables
- Check if backend WebSocket server is running
- Application will fallback to polling automatically

**Cookie Domain Issues**
- Ensure cookies are set for correct domain
- Check SameSite and Secure flags in production

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard:
   ```
   NEXT_PUBLIC_BACKEND_URL=your-backend-url
   NEXT_PUBLIC_WS_URL=your-websocket-url
   COOKIE_SECRET=your-secret-key
   ```
3. Deploy automatically on push to main branch

### Other Platforms

The app is compatible with any platform supporting Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## 🔐 Security Checklist

- [x] Content sanitization with DOMPurify
- [x] No dangerouslySetInnerHTML without sanitization
- [x] Secure cookie storage (HttpOnly, SameSite=Strict)
- [x] Content Security Policy headers
- [x] Input validation with Zod schemas
- [x] Rate limiting on message sending
- [x] XSS prevention measures
- [x] CSRF protection via cookies

## 🗺 Roadmap

- [ ] **Group Chats**: Multi-user conversations
- [ ] **Media Messages**: Image, video, and file sharing
- [ ] **Message Search**: Full-text search across conversations
- [ ] **Push Notifications**: Browser notifications for new messages
- [ ] **Message Reactions**: Emoji reactions to messages
- [ ] **Voice Messages**: Audio message recording and playback
- [ ] **Message Forwarding**: Forward messages between chats
- [ ] **User Status**: Custom status messages
- [ ] **Dark/Light Theme Toggle**: Theme customization
- [ ] **Message Encryption**: End-to-end encryption

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section above
- Review the backend API documentation

---

**ChatPulse** - Connecting conversations, one message at a time. 💬✨