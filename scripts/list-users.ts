#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listUsers() {
    try {
        const users = await prisma.profile.findMany({
            orderBy: {
                created_at: 'asc',
            },
        });

        if (users.length === 0) {
            console.log('ℹ️  No users found in database');
            return;
        }

        console.log('');
        console.log('👥 All Users:');
        console.log('═'.repeat(80));
        console.log('');

        users.forEach((user, index) => {
            console.log(`${index + 1}. ${user.username}`);
            console.log(`   ID:      ${user.id}`);
            console.log(`   Role:    ${user.role === 'admin' ? '👑 Admin' : '👤 Viewer'}`);
            console.log(`   Created: ${user.created_at.toLocaleString()}`);
            console.log(`   Updated: ${user.updated_at.toLocaleString()}`);
            console.log('');
        });

        console.log('═'.repeat(80));
        console.log(`Total: ${users.length} user(s)`);
        console.log('');
    } catch (error) {
        console.error('❌ Failed to list users:', error);
        process.exit(1);
    }
}

listUsers()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
