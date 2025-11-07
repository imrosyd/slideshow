// Check if video files actually exist in Supabase storage
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkVideoFiles() {
  console.log('\n=== Checking video files in Supabase storage ===\n');
  
  // Get all video metadata from database
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
  
  // Check each video file in storage
  for (const video of videos) {
    const videoFilename = video.video_url.split('/').pop();
    const decodedFilename = decodeURIComponent(videoFilename);
    
    console.log(`\nChecking: ${video.filename}`);
    console.log(`  Video URL: ${video.video_url}`);
    console.log(`  Video file: ${decodedFilename}`);
    
    // Try to download just a small chunk to verify existence
    const { data, error: downloadError } = await supabase.storage
      .from('slideshow-videos')
      .download(decodedFilename, {
        transform: {
          width: 100,
          height: 100
        }
      });
    
    if (downloadError) {
      console.log(`  ❌ ERROR: ${downloadError.message}`);
    } else if (data) {
      console.log(`  ✅ File exists (${(data.size / 1024).toFixed(2)} KB)`);
    } else {
      console.log(`  ⚠️  File not found`);
    }
  }
  
  process.exit(0);
}

checkVideoFiles();
