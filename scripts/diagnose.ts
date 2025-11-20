
import { db } from '../lib/db';
import { storage } from '../lib/storage-adapter';
import fs from 'fs';
import path from 'path';

async function diagnose() {
    console.log('Starting diagnosis...');

    // 1. Check Environment Variables
    console.log('\n1. Checking Environment Variables:');
    const requiredEnv = ['ADMIN_PASSWORD', 'DATABASE_URL'];
    const missingEnv = requiredEnv.filter(env => !process.env[env]);

    if (missingEnv.length > 0) {
        console.error(`❌ Missing environment variables: ${missingEnv.join(', ')}`);
    } else {
        console.log('✅ All required environment variables are present.');
    }

    if (process.env.ADMIN_PASSWORD) {
        console.log('✅ ADMIN_PASSWORD is set.');
    } else {
        console.error('❌ ADMIN_PASSWORD is NOT set.');
    }

    // 2. Check Database Connection
    console.log('\n2. Checking Database Connection:');
    try {
        const durations = await db.getImageDurations();
        console.log(`✅ Database connection successful. Retrieved ${durations.length} image durations.`);
    } catch (error: any) {
        console.error('❌ Database connection failed:', error.message);
        if (error.code) console.error('   Code:', error.code);
    }

    // 3. Check Storage Adapter
    console.log('\n3. Checking Storage Adapter:');
    try {
        const images = await storage.listImages();
        console.log(`✅ Storage listImages successful. Found ${images.length} images.`);

        // Check if storage directory exists
        const storageDir = path.join(process.cwd(), 'storage');
        if (fs.existsSync(storageDir)) {
            console.log(`✅ Storage directory exists at ${storageDir}`);
            try {
                await fs.promises.access(storageDir, fs.constants.W_OK);
                console.log('✅ Storage directory is writable.');
            } catch (e) {
                console.error('❌ Storage directory is NOT writable.');
            }
        } else {
            console.error(`❌ Storage directory does NOT exist at ${storageDir}`);
        }

    } catch (error: any) {
        console.error('❌ Storage adapter failed:', error.message);
    }

    console.log('\nDiagnosis complete.');
}

diagnose().catch(err => console.error('Unhandled error:', err));
