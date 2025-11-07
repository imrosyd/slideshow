const https = require('https');

const videoUrls = [
  'https://rcffsmrdqtciwgluxxow.supabase.co/storage/v1/object/public/slideshow-videos/CAR.mp4',
  'https://rcffsmrdqtciwgluxxow.supabase.co/storage/v1/object/public/slideshow-videos/merged-slideshow.mp4'
];

function checkUrl(url) {
  return new Promise((resolve) => {
    console.log(`\n🔍 Checking: ${url}`);
    
    const req = https.request(url, { method: 'HEAD' }, (res) => {
      console.log(`   Status: ${res.statusCode}`);
      console.log(`   Content-Type: ${res.headers['content-type']}`);
      console.log(`   Content-Length: ${res.headers['content-length']} bytes`);
      resolve(res.statusCode === 200);
    });

    req.on('error', (err) => {
      console.log(`   ❌ Error: ${err.message}`);
      resolve(false);
    });

    req.end();
  });
}

async function checkAll() {
  console.log('📹 Checking if video URLs are accessible...');
  
  for (const url of videoUrls) {
    await checkUrl(url);
  }
  
  console.log('\n✅ Check complete');
}

checkAll().catch(console.error);
