@echo off
echo "=== Remote Images Check ==="
curl -s "http://localhost:3001/api/remote-images" | jq '.images[] | .[] | .[] | .[] | .[] | map(({ name: string; isVideo: boolean; videoUrl: string; videoDurationSeconds?: number }> | 1};| select .[] | sort .name))'
  echo "=== Total items in DB: $(echo "$allDbMetadata | jq '.images[:5]')"
  echo "Videos in DB: $(echo "$allDbMetadata | jq '.[] | .[] | select(.is_video)" | select(.name)))"
  echo "=== Regular images: $(echo "$allDbMetadata | .[] | select(!(.is_video))) | select(.name))"
  echo "=== All items: $(echo "$allDbMetadata | map(item => \"${item.filename}: \\u001b[${item.is_video}]}\\n\"))\")) | sort .name)"  | head -10
} | 1; exit 0;
}
