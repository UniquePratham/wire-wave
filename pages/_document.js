import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en" className="dark">
      <Head>
        <title>WireWave | New Era Of Chatting</title>
        {/* Meta tags */}
      

        {/* Favicons */}
        <link rel="icon" type="image/png" href="/images/only_hd_logo.png"></link>
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="192x192"
          href="/icon-192.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="512x512"
          href="/icon-512.png"
        />
        <link rel="manifest" href="/site.webmanifest" />

        {/* Preload custom font (make sure /public/fonts/inter.woff2 exists) */}
       <link
          rel="preload"
          href="/fonts/inter.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />

        {/* Theme color */}
        <meta name="theme-color" content="#0B141A" />
        <meta name="msapplication-TileColor" content="#0B141A" />

        {/* Viewport for mobile */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />
      </Head>
        <meta charSet="utf-8" />
        <meta
          name="description"
          content="WireWave - Premium WhatsApp-style messaging application with real-time chat, secure authentication, and beautiful UI."
        />
        <meta
          name="keywords"
          content="chat, messaging, whatsapp, real-time, websocket, nextjs, react"
        />
        <meta name="author" content="WireWave Team" />
        <meta name="robots" content="index, follow" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta
          property="og:title"
          content="WireWave - Premium Messaging App"
        />
        <meta
          property="og:description"
          content="Experience seamless real-time messaging with WireWave's WhatsApp-style interface."
        />
        <meta property="og:site_name" content="WireWave" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta
          property="twitter:title"
          content="WireWave - Premium Messaging App"
        />
        <meta
          property="twitter:description"
          content="Experience seamless real-time messaging with WireWave's WhatsApp-style interface."
        />
      <body className="bg-chat-bg text-chat-text antialiased">
        <Main />
        <NextScript />

        {/* No-script fallback */}
        <noscript>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: '#0B141A',
              color: '#E9EDF0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              zIndex: 9999,
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            <h1>JavaScript Required</h1>
            <p>WireWave requires JavaScript to function properly.</p>
            <p>Please enable JavaScript in your browser settings.</p>
          </div>
        </noscript>
      </body>
    </Html>
  );
}
