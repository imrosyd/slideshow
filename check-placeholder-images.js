// Check for placeholder images that should be hidden
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPlaceholders() {
  console.log('\n=== Checking for placeholder images that should be hidden ===\n');
  
  // Get all entries that are videos
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
  
  const needsFixing = [];
  
  data.forEach((row, index) => {
    const shouldBeHidden = row.filename.endsWith('.jpg') || row.filename.endsWith('.png');
    const isProperlyHidden = row.hidden === true;
    
    console.log(`${index + 1}. ${row.filename}`);
    console.log(`   - hidden: ${row.hidden}`);
    console.log(`   - should be hidden: ${shouldBeHidden}`);
    console.log(`   - needs fixing: ${shouldBeHidden && !isProperlyHidden ? 'YES ⚠️' : 'NO ✓'}`);
    console.log('');
    
    if (shouldBeHidden && !isProperlyHidden) {
      needsFixing.push(row.filename);
    }
  });
  
  if (needsFixing.length > 0) {
    console.log(`\n⚠️  Found ${needsFixing.length} placeholder images that need to be hidden:`);
    needsFixing.forEach(filename => console.log(`   - ${filename}`));
    console.log('\nThese are placeholder JPG/PNG files and should have hidden=true');
  } else {
    console.log('\n✅ All placeholder images are properly hidden!');
  }
  
  process.exit(0);
}

checkPlaceholders();
