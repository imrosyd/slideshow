// Fix placeholder images by setting hidden=true
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixPlaceholders() {
  console.log('\n=== Fixing placeholder images ===\n');
  
  // Get all video entries that are not hidden
  const { data, error } = await supabase
    .from('image_durations')
    .select('*')
    .eq('is_video', true)
    .eq('hidden', false);
  
  if (error) {
    console.error('Error fetching:', error);
    return;
  }
  
  console.log(`Found ${data.length} video entries that are not hidden:\n`);
  
  const placeholders = data.filter(row => 
    row.filename.endsWith('.jpg') || row.filename.endsWith('.png')
  );
  
  console.log(`${placeholders.length} of them are placeholder images (JPG/PNG)\n`);
  
  if (placeholders.length === 0) {
    console.log('✅ No placeholders need fixing!');
    process.exit(0);
    return;
  }
  
  console.log('Setting hidden=true for these placeholders:\n');
  
  for (const placeholder of placeholders) {
    console.log(`Fixing: ${placeholder.filename}`);
    
    const { error: updateError } = await supabase
      .from('image_durations')
      .update({ hidden: true })
      .eq('filename', placeholder.filename);
    
    if (updateError) {
      console.error(`  ❌ Error: ${updateError.message}`);
    } else {
      console.log(`  ✅ Set hidden=true`);
    }
  }
  
  console.log('\n✅ All placeholder images are now hidden!');
  console.log('\nThese placeholder JPG/PNG files will not appear in slideshow.');
  console.log('Only the actual MP4 videos will be displayed.\n');
  
  process.exit(0);
}

fixPlaceholders();
