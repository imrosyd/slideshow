import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// Create readline interface for user input
function createReadlineInterface() {
    return readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
}

// Prompt user for input
function question(rl: readline.Interface, query: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(query, (answer) => {
            resolve(answer.trim());
        });
    });
}

// Prompt for password (hidden input)
function questionPassword(rl: readline.Interface, query: string): Promise<string> {
    return new Promise((resolve) => {
        const stdin = process.stdin;
        const stdout = process.stdout;

        stdout.write(query);

        // Hide input
        if ((stdin as any).setRawMode) {
            (stdin as any).setRawMode(true);
        }

        let password = '';

        const onData = (char: Buffer) => {
            const str = char.toString('utf8');

            switch (str) {
                case '\n':
                case '\r':
                case '\u0004': // Ctrl-D
                    if ((stdin as any).setRawMode) {
                        (stdin as any).setRawMode(false);
                    }
                    stdin.removeListener('data', onData);
                    stdout.write('\n');
                    resolve(password);
                    break;
                case '\u0003': // Ctrl-C
                    if ((stdin as any).setRawMode) {
                        (stdin as any).setRawMode(false);
                    }
                    process.exit(0);
                    break;
                case '\u007f': // Backspace
                case '\b':
                    if (password.length > 0) {
                        password = password.slice(0, -1);
                        stdout.write('\b \b');
                    }
                    break;
                default:
                    password += str;
                    stdout.write('*');
                    break;
            }
        };

        stdin.on('data', onData);
    });
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

    const rl = createReadlineInterface();

    try {
        // Get username
        let username = await question(rl, '👤 Enter admin username (default: admin): ');
        if (!username) {
            username = 'admin';
        }

        // Validate username
        if (username.length < 3) {
            console.log('❌ Username must be at least 3 characters long');
            rl.close();
            process.exit(1);
        }

        // Check if username already exists
        const existingUser = await prisma.profile.findUnique({
            where: { username },
        });

        if (existingUser) {
            console.log(`❌ Username '${username}' already exists`);
            rl.close();
            process.exit(1);
        }

        // Get password
        let password = await questionPassword(rl, '🔒 Enter admin password (default: admin): ');
        if (!password) {
            password = 'admin';
            console.log('⚠️  Using default password: admin');
        }

        // Validate password
        if (password.length < 4) {
            console.log('❌ Password must be at least 4 characters long');
            rl.close();
            process.exit(1);
        }

        // Confirm password
        const confirmPassword = await questionPassword(rl, '🔒 Confirm password: ');

        if (password !== confirmPassword) {
            console.log('❌ Passwords do not match');
            rl.close();
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
    } finally {
        rl.close();
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
