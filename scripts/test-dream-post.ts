/**
 * Test script: runs the full dream pipeline and posts the video to Twitter.
 * Usage: bun run scripts/test-dream-post.ts
 */
import 'dotenv/config';
import { generateDreamVideo } from '../src/plugins/dream/services/videoGeneration.ts';
import { postDreamToTwitter } from '../src/plugins/dream/services/twitterPost.ts';

const testDream =
  'A vast laboratory stretches into darkness, its walls lined with thousands of glowing screens displaying cascading molecular structures that morph into surveillance cameras. In the center, a massive transparent brain made of crystalline neural networks pulses with electric blue light while shadowy figures in lab coats circle it, their clipboards transforming into cage bars. The air hums with encrypted data packets being shredded by invisible hands.';

async function main() {
  console.log('=== FULL DREAM PIPELINE TEST ===\n');

  // Force dry run OFF for this test
  const wasDryRun = process.env.TWITTER_DRY_RUN;
  process.env.TWITTER_DRY_RUN = 'false';

  try {
    // Step 1: Generate video
    console.log('Step 1: Generating video via fal.ai Kling v3 Pro...');
    const videoUrl = await generateDreamVideo(testDream);
    console.log(`Video URL: ${videoUrl}\n`);

    // Step 2: Post to Twitter
    console.log('Step 2: Uploading video and posting to Twitter...');
    const tweetId = await postDreamToTwitter(videoUrl);
    console.log(`\nTweet posted! https://twitter.com/i/status/${tweetId}`);
  } catch (error) {
    console.error('Pipeline failed:', error);
  } finally {
    process.env.TWITTER_DRY_RUN = wasDryRun;
  }
}

main();
