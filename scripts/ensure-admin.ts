import { db } from '../lib/db';
import bcrypt from 'bcrypt';

async function ensureAdmin() {
    console.log('Starting admin user check...');

    const username = 'admin';

    try {
        const existingUser = await (db as any).getProfileByUsername(username);

        if (existingUser) {
            // Do NOT reset an existing admin's password. The old behaviour
            // overwrote it from ADMIN_PASSWORD on every run, which would clobber
            // a strong password chosen in-app. Credentials are managed from the
            // admin page now.
            console.log(`ℹ️ User '${username}' already exists; leaving credentials unchanged.`);
            return;
        }

        // Fresh install: seed the first admin. Default to admin/admin so a new
        // deploy is reachable out of the box; the operator changes it from the
        // admin page on first login.
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin';
        if (!process.env.ADMIN_PASSWORD) {
            console.warn('⚠️  ADMIN_PASSWORD not set — creating default admin / admin.');
            console.warn('⚠️  Change it immediately from the admin page, especially if this instance is reachable from the internet.');
        }

        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        await (db as any).prisma.profile.create({
            data: { username, password: hashedPassword, role: 'admin' },
        });
        console.log(`✅ Created user '${username}'.`);
    } catch (error) {
        console.error('❌ Failed to ensure admin user:', error);
        process.exit(1);
    }
}

ensureAdmin();
