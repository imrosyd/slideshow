import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcrypt';
import { verifyAuth } from '../../../lib/auth';
import { db } from '../../../lib/db';

// Lets a signed-in admin change their own username and/or password.
// The current password is required as a confirmation step so a hijacked, still-open
// session cannot silently lock the real owner out.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await verifyAuth(req, res);
  if (!auth.authenticated || auth.role !== 'admin' || !auth.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { currentPassword, newUsername, newPassword } = (req.body ?? {}) as {
    currentPassword?: string;
    newUsername?: string;
    newPassword?: string;
  };

  if (!currentPassword) {
    return res.status(400).json({ error: 'Current password is required' });
  }
  if (!newUsername && !newPassword) {
    return res.status(400).json({ error: 'Provide a new username or a new password' });
  }

  const profile = await db.getProfileById(auth.userId);
  if (!profile) {
    return res.status(404).json({ error: 'User not found' });
  }

  const currentOk = await bcrypt.compare(currentPassword, profile.password);
  if (!currentOk) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const data: { username?: string; password?: string } = {};

  if (newUsername && newUsername !== profile.username) {
    if (newUsername.trim().length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }
    const taken = await db.getProfileByUsername(newUsername);
    if (taken) {
      return res.status(409).json({ error: 'Username already taken' });
    }
    data.username = newUsername.trim();
  }

  if (newPassword) {
    if (newPassword.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }
    data.password = await bcrypt.hash(newPassword, 10);
  }

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ error: 'Nothing to change' });
  }

  await db.updateProfile(auth.userId, data);

  return res.status(200).json({
    success: true,
    username: data.username ?? profile.username,
    passwordChanged: Boolean(data.password),
  });
}
