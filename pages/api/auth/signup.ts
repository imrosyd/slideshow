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

  try {
    const adminUsername = process.env.USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'password';

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
