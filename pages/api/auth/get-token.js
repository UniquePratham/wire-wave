// /pages/api/auth/get-token.js
import { parse } from 'cookie';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const cookies = req.headers.cookie ? parse(req.headers.cookie) : {};
  const token = cookies.auth_token || null;

  if (!token) {
    return res.status(200).json({ token: null, user: null });
  }

  // Try to decode email from JWT payload
  let user = null;
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    user = { email: payload.email || '' };
  } catch {
    user = { email: '' };
  }

  return res.status(200).json({ token, user });
}
