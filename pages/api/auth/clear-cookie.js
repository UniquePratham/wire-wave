import { serialize } from 'cookie';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Clear secure, httpOnly cookie
    const cookie = serialize(process.env.COOKIE_NAME || 'chatpulse_auth', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0, // Expire immediately
      path: '/',
    });

    res.setHeader('Set-Cookie', cookie);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error clearing cookie:', error);
    res.status(500).json({ message: 'Failed to clear cookie' });
  }
}