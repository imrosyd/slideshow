import { PrismaClient } from '@prisma/client';
import * as readlineSync from 'readline-sync';
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// Helper functions using readline-sync for interactive prompts
function askQuestion(query: string, defaultValue?: string): string {
    const answer = readlineSync.question(query);
    return answer.trim() || defaultValue || '';
}

function askPassword(query: string, defaultValue?: string): string {
    const password = readlineSync.question(query, { hideEchoBack: true });
    return password || defaultValue || '';
}

async function main() {
    console.log('\n🚀 Slideshow Database Seeding\n');
    console.log('═══════════════════════════════════════════════════════════');

    // Check if admin already exists
    const existingAdmin = await prisma.profile.findFirst({
        where: { role: 'admin' },
    });

    if (existingAdmin) {
        console.log('✅ Admin user already exists:');
        console.log(`   Username: ${existingAdmin.username}`);
        console.log(`   Role:     ${existingAdmin.role}`);
        console.log('\n💡 Tip: Use "npm run add-user" to create additional users');
        console.log('═══════════════════════════════════════════════════════════\n');
        return;
    }

    console.log('📝 No admin user found. Let\'s create one!\n');

    try {
        // Get username
        let username = askQuestion('👤 Enter admin username (default: admin): ', 'admin');
        // Validate username
        if (username.length < 2) {
            console.log('❌ Username must be at least 3 characters long');
            process.exit(1);
        }
        // Check if username already exists
        const existingUser = await prisma.profile.findUnique({
            where: { username },
        });
        if (existingUser) {
            console.log(`❌ Username '${username}' already exists`);
            process.exit(1);
        }
        // Get password
        let password = askPassword('🔒 Enter admin password (default: admin): ', 'admin');
        if (!password) {
            password = 'admin';
            console.log('⚠️  Using default password: admin');
        }
        // Validate password
        if (password.length < 4) {
            console.log('❌ Password must be at least 4 characters long');
            process.exit(1);
        }
        // Confirm password
        const confirmPassword = askPassword('🔒 Confirm password: ');
        if (password !== confirmPassword) {
            console.log('❌ Passwords do not match');
            process.exit(1);
        }
        console.log('\n⏳ Creating admin user...');
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        // Create admin user
        const newUser = await prisma.profile.create({
            data: {
                username,
                password: hashedPassword,
                role: 'admin',
            },
        });
        console.log('\n✅ Admin user created successfully!');
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`   Username: ${newUser.username}`);
        console.log(`   Role:     ${newUser.role}`);
        console.log(`   ID:       ${newUser.id}`);
        console.log('═══════════════════════════════════════════════════════════');
        console.log('\n💡 You can now login with these credentials');
        console.log('💡 Use "npm run add-user" to create additional users\n');
    } catch (error) {
        console.error('\n❌ Error during seeding:', error);
        throw error;
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
