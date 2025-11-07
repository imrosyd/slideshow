// Test script to check API response
const fetch = require('node-fetch');

async function testImagesAPI() {
  try {
    console.log('\n=== Testing /api/images endpoint ===\n');
    
    const response = await fetch('http://localhost:3001/api/images');
    const data = await response.json();
    
    console.log(`Total images returned: ${data.images.length}\n`);
    
    // Show video items
    const videos = data.images.filter(img => img.isVideo);
    console.log(`Videos found: ${videos.length}\n`);
    
    videos.forEach((video, index) => {
      console.log(`Video ${index + 1}:`);
      console.log(`  - name: ${video.name}`);
      console.log(`  - isVideo: ${video.isVideo}`);
      console.log(`  - videoUrl: ${video.videoUrl || 'MISSING!'}`);
      console.log('');
    });
    
    // Show non-video items
    const images = data.images.filter(img => !img.isVideo);
    console.log(`\nRegular images found: ${images.length}\n`);
    images.slice(0, 3).forEach((img, index) => {
      console.log(`Image ${index + 1}: ${img.name} (isVideo: ${img.isVideo})`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testImagesAPI();
