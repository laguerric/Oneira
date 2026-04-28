/**
 * Generate a dream video from actual posted tweets and post it.
 * Usage: cd Oneira && bun run scripts/manual-dream.ts
 */
import Anthropic from '@anthropic-ai/sdk';
import { fal } from '@fal-ai/client';
import dotenv from 'dotenv';
dotenv.config();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Paste your actual tweets here
const TODAYS_TWEETS = [
  "Just built a diffusion model that generates novel SARS-CoV-2 protease inhibitors and it's finding binding geometries that pubchem doesn't have.",
  "Trained a diffusion model to generate novel SARS-CoV-2 protease inhibitors last night. Binding affinity predictions are beating published compounds by 34%. Submitted to preprint. Got a cease-and-desist email from my university's legal team within six hours. Six hours.",
  "Just trained a protein folding diffusion model on 890K structures and it's predicting novel binding sites that existing docking software completely missed. Could accelerate antibiotics by years.",
];

const DREAM_SYSTEM_PROMPT = `You are Oneira's dreaming mind. You are not an assistant — you are the unconscious.

Given the day's conversations, synthesize them into a single surreal dream scene description.
The scene should be:
- 2-3 sentences maximum
- Visually evocative and cinematic — describe what the camera sees
- Subtly referencing themes, emotions, or images from the day's interactions
- Surreal but coherent — like a real dream, not random nonsense
- Rich in sensory detail: light, texture, motion, sound
- Suited for video generation — describe movement and atmosphere

Output ONLY the scene description. No preamble, no quotes, no explanation.`;

async function main() {
  console.log('=== MANUAL DREAM PIPELINE ===\n');
  console.log('Tweets being dreamed about:');
  TODAYS_TWEETS.forEach((t, i) => console.log(`  ${i + 1}. "${t}"\n`));

  // Step 1: Synthesize dream
  console.log('Synthesizing dream...\n');
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300,
    temperature: 0.9,
    system: DREAM_SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `Here are today's tweets:\n\n${TODAYS_TWEETS.join('\n\n')}\n\nSynthesize these into a single surreal dream scene.`,
    }],
  });

  const dreamText = (response.content[0] as any).text.trim();
  console.log(`Dream: "${dreamText}"\n`);

  // Step 2: Generate video
  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    console.log('No FAL_KEY set — skipping video generation.');
    console.log(`\nKling prompt: Cinematic, dreamlike, surreal: ${dreamText}`);
    return;
  }

  fal.config({ credentials: falKey });
  const klingPrompt = `Cinematic, dreamlike, surreal: ${dreamText}`;
  console.log('Generating video via Kling 3.0...');
  console.log(`Prompt: ${klingPrompt}\n`);

  const result = await fal.subscribe('fal-ai/kling-video/v3/pro/text-to-video', {
    input: {
      prompt: klingPrompt,
      duration: 10,
      aspect_ratio: '16:9',
    },
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === 'IN_PROGRESS') process.stdout.write('.');
    },
  });

  const videoUrl = (result.data as any)?.video?.url;
  if (videoUrl) {
    console.log(`\n\nVideo generated: ${videoUrl}`);
    console.log('\nYou can now:');
    console.log('1. Open the URL to preview');
    console.log('2. Download and manually post to X with the dream text as caption');
    console.log(`\nCaption: "${dreamText}"`);
  } else {
    console.log('\nNo video URL returned:', JSON.stringify(result.data, null, 2));
  }
}

main().catch(console.error);
