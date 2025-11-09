#!/bin/bash

echo "=== Testing API Responses ==="
echo ""
echo "1. curl /api/images"
curl -s "http://localhost:3001/api/images" | head -50
echo ""
echo "2. Testing video filtering logic"
curl -s "http://localhost:3001/api/images" | jq .
  '.images[] | .[] | .[] | map([select(.name, .isVideo, .videoUrl, .hidden)] | select.(name)) | .[] | map([.name, .isVideo, .videoUrl, .hidden])' | .sort .name
echo ""
echo "3. Testing remote-images..."
curl -s "http://localhost:3001/api/remote-images" | jq .
  '.images[] | .[] | .[] | map([.name, .isVideo, .hidden]) | select.(name)) | .[] | map([.name, .isVideo, .hidden]) | .sort .name' | head -30
