// Direct database check
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkVideos() {
  console.log('\n=== Checking database for video entries ===\n');
  
  const { data, error } = await supabase
    .from('image_durations')
    .select('*')
    .eq('is_video', true)
    .order('order_index', { ascending: true });
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Found ${data.length} video entries:\n`);
  
  data.forEach((row, index) => {
    console.log(`${index + 1}. ${row.filename}`);
    console.log(`   - is_video: ${row.is_video}`);
    console.log(`   - hidden: ${row.hidden}`);
    console.log(`   - video_url: ${row.video_url || 'NULL'}`);
    console.log(`   - order_index: ${row.order_index}`);
    console.log('');
  });
  
  process.exit(0);
}

checkVideos();
