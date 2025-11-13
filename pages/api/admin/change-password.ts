import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    // Validate new password
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    // Check current password
    const envPassword = process.env.ADMIN_PASSWORD || 'admin123';
    if (currentPassword !== envPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Update .env.local file
    const envPath = path.join(process.cwd(), '.env.local');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf-8');
      
      // Replace ADMIN_PASSWORD line
      if (envContent.includes('ADMIN_PASSWORD=')) {
        envContent = envContent.replace(
          /ADMIN_PASSWORD=.*/,
          `ADMIN_PASSWORD=${newPassword}`
        );
      } else {
        envContent += `\nADMIN_PASSWORD=${newPassword}\n`;
      }
    } else {
      // Create new .env.local
      envContent = `ADMIN_PASSWORD=${newPassword}
USE_FILESYSTEM_STORAGE=true
STORAGE_PATH=./storage
STORAGE_PUBLIC_URL=/api/storage
DATABASE_URL=file:./prisma/dev.db
`;
    }

    fs.writeFileSync(envPath, envContent);

    // Update environment variable
    process.env.ADMIN_PASSWORD = newPassword;

    // Mark password as changed in database
    try {
      const existing = await prisma.adminConfig.findFirst();
      
      if (existing) {
        await prisma.adminConfig.update({
          where: { id: existing.id },
          data: { 
            password_changed: true,
            updated_at: new Date()
          }
        });
      } else {
        await prisma.adminConfig.create({
          data: { password_changed: true }
        });
      }
    } catch (dbError) {
      console.warn('[Change Password] Database update warning:', dbError);
      // Continue even if database update fails
    }

    console.log('[Change Password] Password changed successfully');

    return res.status(200).json({ 
      success: true, 
      message: 'Password changed successfully. Please login again with your new password.' 
    });

  } catch (error) {
    console.error('[Change Password] Error:', error);
    return res.status(500).json({ 
      error: 'Failed to change password',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    await prisma.$disconnect();
  }
}
