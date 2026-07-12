import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../../../lib/jwt-secret';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let jwtSecret: string;
  try {
    jwtSecret = getJwtSecret();
  } catch (error) {
    console.error('[Login]', error instanceof Error ? error.message : error);
    return res.status(500).json({ error: 'Server misconfigured: JWT_SECRET is not set' });
  }

  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const profile = await (db as any).getProfileByUsername(username);
    if (!profile) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const passwordMatch = await bcrypt.compare(password, profile.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: profile.id, username: profile.username, role: profile.role },
      jwtSecret,
      { expiresIn: '1h' }
    );

    res.status(200).json({ token });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Failed to log in' });
  }
}
