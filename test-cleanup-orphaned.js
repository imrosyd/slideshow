#!/usr/bin/env node
/**
 * Test script to verify cleanup-corrupt-videos API
 * 
 * This will:
 * 1. Show current database entries
 * 2. Show current storage files
 * 3. Call cleanup API
 * 4. Show results
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('\n🔍 BEFORE CLEANUP\n');
  console.log('='.repeat(60));
  
  // Show database entries
  const { data: dbEntries } = await supabase
    .from('image_durations')
    .select('filename, is_video, hidden')
    .order('filename');
  
  console.log(`\n📊 Database Entries (${dbEntries.length} total):`);
  dbEntries.forEach(entry => {
    const type = entry.is_video ? '[VIDEO]' : '[IMAGE]';
    const hidden = entry.hidden ? ' (hidden)' : '';
    console.log(`  ${type} ${entry.filename}${hidden}`);
  });
  
  // Show storage files
  const { data: storageFiles } = await supabase
    .storage
    .from('slideshow-images')
    .list();
  
  console.log(`\n📁 Storage Files (${storageFiles.length} total):`);
  storageFiles.forEach(file => {
    console.log(`  ${file.name}`);
  });
  
  // Identify orphans
  console.log('\n🔍 Orphan Analysis:');
  
  const storageFilenames = new Set(storageFiles.map(f => f.name));
  const dbFilenames = new Set(dbEntries.filter(e => !e.is_video).map(e => e.filename));
  
  const orphanedDbEntries = [...dbFilenames].filter(name => 
    !storageFilenames.has(name) && name !== '.emptyFolderPlaceholder'
  );
  
  const orphanedFiles = [...storageFilenames].filter(name => 
    !dbFilenames.has(name) && 
    name !== '.emptyFolderPlaceholder' && 
    name !== 'metadata.json'
  );
  
  console.log(`  📝 Orphaned DB entries (in DB, not in storage): ${orphanedDbEntries.length}`);
  orphanedDbEntries.forEach(name => console.log(`    - ${name}`));
  
  console.log(`  🗂️  Orphaned files (in storage, not in DB): ${orphanedFiles.length}`);
  orphanedFiles.forEach(name => console.log(`    - ${name}`));
  
  // Call cleanup API
  console.log('\n\n🧹 RUNNING CLEANUP...\n');
  console.log('='.repeat(60));
  
  const response = await fetch('http://localhost:3001/api/admin/cleanup-corrupt-videos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (!response.ok) {
    console.error('❌ Cleanup failed:', response.status, response.statusText);
    const text = await response.text();
    console.error(text);
    process.exit(1);
  }
  
  const result = await response.json();
  
  console.log('\n✅ Cleanup Result:');
  console.log(`  Orphaned storage files removed: ${result.orphanedFiles || 0}`);
  if (result.orphanedFilesList && result.orphanedFilesList.length > 0) {
    result.orphanedFilesList.forEach(name => console.log(`    - ${name}`));
  }
  
  console.log(`  Orphaned DB entries removed: ${result.orphanedDbEntries || 0}`);
  if (result.orphanedDbEntriesList && result.orphanedDbEntriesList.length > 0) {
    result.orphanedDbEntriesList.forEach(name => console.log(`    - ${name}`));
  }
  
  console.log(`  Corrupt videos checked: ${result.checked}`);
  console.log(`  Corrupt videos deleted: ${result.deleted}`);
  console.log(`  Valid videos kept: ${result.kept}`);
  
  // Show after cleanup
  console.log('\n\n✨ AFTER CLEANUP\n');
  console.log('='.repeat(60));
  
  const { data: dbEntriesAfter } = await supabase
    .from('image_durations')
    .select('filename, is_video, hidden')
    .order('filename');
  
  console.log(`\n📊 Database Entries (${dbEntriesAfter.length} total):`);
  dbEntriesAfter.forEach(entry => {
    const type = entry.is_video ? '[VIDEO]' : '[IMAGE]';
    const hidden = entry.hidden ? ' (hidden)' : '';
    console.log(`  ${type} ${entry.filename}${hidden}`);
  });
  
  const { data: storageFilesAfter } = await supabase
    .storage
    .from('slideshow-images')
    .list();
  
  console.log(`\n📁 Storage Files (${storageFilesAfter.length} total):`);
  storageFilesAfter.forEach(file => {
    console.log(`  ${file.name}`);
  });
  
  console.log('\n✅ Done!\n');
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
