#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function addUser() {
    // Get arguments from command line
    const args = process.argv.slice(2);

    if (args.length < 2) {
        console.log('❌ Usage: npm run add-user <username> <password> [role]');
        console.log('   role: admin or viewer (default: viewer)');
        console.log('');
        console.log('Examples:');
        console.log('  npm run add-user john mypassword123');
        console.log('  npm run add-user admin admin123 admin');
        console.log('  npm run add-user viewer1 pass123 viewer');
        process.exit(1);
    }

    const username = args[0];
    const password = args[1];
    const role = args[2] || 'viewer'; // default to viewer

    // Validate role
    if (role !== 'admin' && role !== 'viewer') {
        console.error('❌ Role must be either "admin" or "viewer"');
        process.exit(1);
    }

    try {
        // Check if user already exists
        const existingUser = await prisma.profile.findUnique({
            where: { username },
        });

        if (existingUser) {
            console.error(`❌ User "${username}" already exists!`);
            console.log('💡 Use update-user script to modify existing user');
            process.exit(1);
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const newUser = await prisma.profile.create({
            data: {
                username,
                password: hashedPassword,
                role,
            },
        });

        console.log('✅ User created successfully!');
        console.log('');
        console.log('📋 User Details:');
        console.log(`   ID:       ${newUser.id}`);
        console.log(`   Username: ${newUser.username}`);
        console.log(`   Role:     ${newUser.role}`);
        console.log(`   Created:  ${newUser.created_at}`);
        console.log('');
        console.log(`🔐 Login credentials:`);
        console.log(`   Username: ${username}`);
        console.log(`   Password: ${password}`);
        console.log('');
    } catch (error) {
        console.error('❌ Failed to create user:', error);
        process.exit(1);
    }
}

addUser()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
