import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/db';
import bcrypt from 'bcrypt';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // This endpoint is unauthenticated by design (it bootstraps the first admin),
  // so it must never invent a password. Falling back to "password" here handed
  // anyone who could reach the server a working admin login.
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error('[Signup] ADMIN_PASSWORD is not set; refusing to create an admin user.');
    return res.status(500).json({ error: 'Server misconfigured: ADMIN_PASSWORD is not set' });
  }

  try {
    const adminUsername = process.env.USERNAME || 'admin';

    const existingAdmin = await (db as any).getProfileByUsername(adminUsername);
    if (existingAdmin) {
      return res.status(409).json({ error: 'Admin user already exists' });
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    await (db as any).createProfile({
      username: adminUsername,
      password: hashedPassword,
      role: 'admin',
    });

    res.status(201).json({ message: 'Admin user created successfully' });
  } catch (error) {
    console.error('Error creating admin user:', error);
    res.status(500).json({ error: 'Failed to create admin user' });
  }
}
