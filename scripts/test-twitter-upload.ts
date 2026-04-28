/**
 * Test script: uploads an existing video to Twitter (skips fal.ai generation).
 * Usage: bun run scripts/test-twitter-upload.ts
 */
import 'dotenv/config';
import { postDreamToTwitter } from '../src/plugins/dream/services/twitterPost.ts';

// Use the last generated video URL
const videoUrl = 'https://v3b.fal.media/files/b/0a981155/ShPbfDDw3ufcEXDQFC82A_output.mp4';

async function main() {
  console.log('=== TWITTER VIDEO UPLOAD TEST ===\n');

  // Force dry run OFF
  process.env.TWITTER_DRY_RUN = 'false';

  console.log(`Uploading video: ${videoUrl}`);
  const tweetId = await postDreamToTwitter(videoUrl);
  console.log(`\nTweet posted! https://twitter.com/i/status/${tweetId}`);
}

main();
