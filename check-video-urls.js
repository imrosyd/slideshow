const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkVideoUrls() {
  console.log('📊 Checking video URLs in database...\n');
  
  // Get all records with is_video = true
  const { data, error } = await supabase
    .from('image_durations')
    .select('filename, video_url, is_video, hidden, order_index, video_generated_at')
    .eq('is_video', true)
    .order('order_index', { ascending: true });

  if (error) {
    console.error('❌ Database error:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('⚠️  No video records found in database');
    return;
  }

  console.log(`✅ Found ${data.length} video records:\n`);
  
  data.forEach((record, index) => {
    console.log(`${index + 1}. ${record.filename}`);
    console.log(`   Video URL: ${record.video_url || '(empty)'}`);
    console.log(`   Hidden: ${record.hidden}`);
    console.log(`   Order: ${record.order_index}`);
    console.log(`   Generated: ${record.video_generated_at || 'N/A'}`);
    console.log('');
  });

  // Also check what the API would return
  console.log('\n📡 Testing what /api/images would return...\n');
  
  const { data: allDbMetadata } = await supabase
    .from('image_durations')
    .select('*')
    .order('order_index', { ascending: true });

  const videoMap = {};
  allDbMetadata.forEach((row) => {
    if (row.is_video && row.video_url) {
      videoMap[row.filename] = {
        isVideo: true,
        videoUrl: row.video_url,
      };
    }
  });

  const visibleItems = allDbMetadata.filter(item => !item.hidden || item.is_video);
  
  const imageData = visibleItems.map((item) => ({
    name: item.filename,
    isVideo: videoMap[item.filename]?.isVideo || false,
    videoUrl: videoMap[item.filename]?.videoUrl,
  }));

  const videoSlides = imageData.filter(item => item.isVideo && item.videoUrl);
  
  console.log(`API would return ${imageData.length} total items`);
  console.log(`Of which ${videoSlides.length} are valid video slides:\n`);
  
  videoSlides.forEach((slide, index) => {
    console.log(`${index + 1}. ${slide.name}`);
    console.log(`   videoUrl: ${slide.videoUrl}`);
    console.log('');
  });
}

checkVideoUrls()
  .then(() => {
    console.log('✅ Check complete');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
