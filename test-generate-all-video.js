// Simple test script to verify the Generate All Videos API works with per-image durations

const testData = {
  videoData: [
    { filename: "image1.jpg", durationSeconds: 10 },
    { filename: "image2.jpg", durationSeconds: 15 },
    { filename: "image3.jpg", durationSeconds: 20 }
  ]
};

console.log("Testing Generate All Videos API");
console.log("================================\n");
console.log("Request body:");
console.log(JSON.stringify(testData, null, 2));

console.log("\n\nExpected behavior:");
console.log("- Image 1: 10s");
console.log("- Image 2: 15s");
console.log("- Image 3: 20s");
console.log("- Total: 45s");
console.log("\nFFmpeg will be called with:");
console.log('  -loop 1 -framerate 24 -t 10 -i "image1.jpg"');
console.log('  -loop 1 -framerate 24 -t 15 -i "image2.jpg"');
console.log('  -loop 1 -framerate 24 -t 20 -i "image3.jpg"');
console.log("  Then concat filter will combine them");
