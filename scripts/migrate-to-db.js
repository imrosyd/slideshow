/**
 * Script to migrate metadata.json to Supabase database
 * Run: node scripts/migrate-to-db.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_STORAGE_BUCKET) {
  console.error('❌ Missing environment variables!');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function migrateMetadata() {
  console.log('🔄 Starting migration from metadata.json to database...\n');

  try {
    // Download metadata.json from storage
    const { data: metadataFile, error: downloadError } = await supabase.storage
      .from(SUPABASE_STORAGE_BUCKET)
      .download('metadata.json');

    if (downloadError) {
      console.log('⚠️  No metadata.json found in storage. Skipping migration.');
      return;
    }

    const text = await metadataFile.text();
    const metadata = JSON.parse(text);

    console.log(`📦 Found ${Object.keys(metadata.images || {}).length} images in metadata.json`);
    console.log(`📋 Order: ${metadata.order?.length || 0} items\n`);

    // Migrate each image to database
    let successCount = 0;
    let errorCount = 0;

    for (const [filename, imgData] of Object.entries(metadata.images || {})) {
      const orderIndex = metadata.order?.indexOf(filename) ?? 999;
      
      const { error } = await supabase
        .from('image_durations')
        .upsert({
          filename: imgData.filename,
          duration_ms: imgData.duration_ms,
          caption: imgData.caption || null,
          order_index: orderIndex >= 0 ? orderIndex : 999,
          hidden: imgData.hidden || false,
        }, {
          onConflict: 'filename',
        });

      if (error) {
        console.error(`❌ Failed to migrate ${filename}:`, error.message);
        errorCount++;
      } else {
        console.log(`✅ Migrated: ${filename} (hidden: ${imgData.hidden || false}, order: ${orderIndex})`);
        successCount++;
      }
    }

    console.log(`\n✨ Migration complete!`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);

    // Verify migration
    const { data: dbData, error: verifyError } = await supabase
      .from('image_durations')
      .select('*');

    if (!verifyError) {
      console.log(`\n📊 Database now contains ${dbData.length} records`);
      const hiddenCount = dbData.filter(r => r.hidden).length;
      console.log(`   Hidden images: ${hiddenCount}`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateMetadata();
