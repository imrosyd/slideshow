
import { db } from '../lib/db';
import bcrypt from 'bcrypt';

async function ensureAdmin() {
    console.log('Starting admin user check...');

    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
        console.error('❌ ADMIN_PASSWORD environment variable is not set.');
        process.exit(1);
    }

    const username = 'admin';

    try {
        // Check if admin exists
        const existingUser = await (db as any).getProfileByUsername(username);

        if (existingUser) {
            console.log(`ℹ️ User '${username}' already exists.`);
            // Update password to match env var
            const hashedPassword = await bcrypt.hash(adminPassword, 10);
            await (db as any).prisma.profile.update({
                where: { username },
                data: { password: hashedPassword, role: 'admin' },
            });
            console.log(`✅ Updated password for user '${username}'.`);
        } else {
            console.log(`ℹ️ User '${username}' does not exist. Creating...`);
            const hashedPassword = await bcrypt.hash(adminPassword, 10);
            await (db as any).prisma.profile.create({
                data: {
                    username,
                    password: hashedPassword,
                    role: 'admin',
                },
            });
            console.log(`✅ Created user '${username}'.`);
        }

    } catch (error) {
        console.error('❌ Failed to ensure admin user:', error);
        process.exit(1);
    }
}

ensureAdmin();
