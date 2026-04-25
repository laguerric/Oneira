/**
 * Test fal.ai Kling video generation with a sample dream prompt.
 * Usage: cd oneira && bun run scripts/test-fal-video.ts
 */
import { fal } from '@fal-ai/client';
import dotenv from 'dotenv';
dotenv.config();

const FAL_KEY = process.env.FAL_KEY;
if (!FAL_KEY) {
  console.error('FAL_KEY not set in .env');
  process.exit(1);
}

fal.config({ credentials: FAL_KEY });

const dreamPrompt = `Cinematic, dreamlike, surreal: A vast laboratory stretches into darkness, its walls lined with thousands of glowing computer screens displaying cascading medical images that morph into surveillance cameras, each one blinking in synchronized patterns. In the center, a massive transparent brain made of crystalline neural networks pulses with electric blue light while shadowy figures circle it like vultures, their clipboards transforming into cage bars that slowly contract around the luminous synapses.`;

async function main() {
  console.log('Testing fal.ai Kling 3.0 video generation...');
  console.log(`Prompt: ${dreamPrompt.substring(0, 80)}...`);
  console.log('Duration: 15s, Aspect ratio: 16:9\n');

  const result = await fal.subscribe('fal-ai/kling-video/v2/master/text-to-video', {
    input: {
      prompt: dreamPrompt,
      duration: 10,
      aspect_ratio: '16:9',
    },
    logs: true,
    onQueueUpdate: (update) => {
      console.log(`Status: ${update.status}`);
    },
  });

  const videoUrl = (result.data as any)?.video?.url;
  if (videoUrl) {
    console.log(`\nVideo generated successfully!`);
    console.log(`URL: ${videoUrl}`);
    console.log(`\nOpen this URL in your browser to preview the dream video.`);
  } else {
    console.log('\nNo video URL returned. Full response:');
    console.log(JSON.stringify(result.data, null, 2));
  }
}

main().catch(console.error);
