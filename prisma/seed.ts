import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const username = 'admin';
    const password = 'admin'; // Default password

    const existingUser = await prisma.profile.findUnique({
        where: { username },
    });

    if (!existingUser) {
        console.log(`Creating superadmin user '${username}'...`);
        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.profile.create({
            data: {
                username,
                password: hashedPassword,
                role: 'admin',
            },
        });
        console.log(`Superadmin user '${username}' created successfully.`);
    } else {
        console.log(`Superadmin user '${username}' already exists.`);
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
