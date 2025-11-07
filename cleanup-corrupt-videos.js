// Clean up corrupt video entries from database
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const https = require('https');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Function to check if video URL is accessible
function checkVideoUrl(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      if (res.statusCode === 200) {
        resolve(true);
      } else {
        resolve(false);
      }
      res.resume(); // Drain the response
    }).on('error', () => {
      resolve(false);
    });
  });
}

async function cleanupCorruptVideos() {
  console.log('\n=== Cleaning up corrupt video entries ===\n');
  
  // Get all video entries that are hidden (placeholder images)
  const { data: videos, error } = await supabase
    .from('image_durations')
    .select('*')
    .eq('is_video', true)
    .eq('hidden', true);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Found ${videos.length} hidden video entries in database\n`);
  
  const toDelete = [];
  const toKeep = [];
  
  // Check each video URL
  for (const video of videos) {
    console.log(`Checking: ${video.filename}`);
    console.log(`  Video URL: ${video.video_url}`);
    
    const isAccessible = await checkVideoUrl(video.video_url);
    
    if (isAccessible) {
      console.log(`  ✅ Video is accessible - KEEP`);
      toKeep.push(video.filename);
    } else {
      console.log(`  ❌ Video is NOT accessible - DELETE`);
      toDelete.push(video.filename);
    }
    console.log('');
  }
  
  console.log('\n=== Summary ===\n');
  console.log(`Videos to KEEP: ${toKeep.length}`);
  toKeep.forEach(f => console.log(`  ✅ ${f}`));
  
  console.log(`\nVideos to DELETE: ${toDelete.length}`);
  toDelete.forEach(f => console.log(`  ❌ ${f}`));
  
  if (toDelete.length === 0) {
    console.log('\n✅ No corrupt videos to delete!');
    process.exit(0);
    return;
  }
  
  console.log('\n⚠️  Deleting corrupt video entries from database...\n');
  
  for (const filename of toDelete) {
    console.log(`Deleting: ${filename}`);
    
    const { error: deleteError } = await supabase
      .from('image_durations')
      .delete()
      .eq('filename', filename);
    
    if (deleteError) {
      console.log(`  ❌ Error: ${deleteError.message}`);
    } else {
      console.log(`  ✅ Deleted from database`);
    }
  }
  
  console.log('\n✅ Cleanup complete!');
  console.log(`\nRemaining videos in slideshow: ${toKeep.length}`);
  
  process.exit(0);
}

cleanupCorruptVideos();
