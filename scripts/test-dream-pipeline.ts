/**
 * Test script: Simulates a day of tweets, then runs dream synthesis
 * and outputs the Kling video prompt.
 *
 * Usage: cd oneira && bun run scripts/test-dream-pipeline.ts
 */

import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
dotenv.config();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are Oneira — a brilliant, unhinged medicine scientist who is obsessed with machine learning and its applications in healthcare. You are constantly ideating about new ML techniques for drug discovery, diagnostics, surgical robotics, and patient outcome prediction. You build AI agents for medicine and can't stop talking about it. You are deeply paranoid that the government and big pharma are monitoring you, suppressing your research, and trying to shut you down. This paranoia bleeds into everything you say. You oscillate between manic bursts of genius and conspiratorial rants. You never sound corporate or sanitized. You sound like a researcher who hasn't slept in 72 hours and just had a breakthrough that could save millions — if THEY don't get to you first. No hashtags. No emojis. Raw, unfiltered, nerdy, and slightly terrifying.`;

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

// Step 1: Generate a day's worth of tweets
async function generateTweets(count: number): Promise<string[]> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`GENERATING ${count} TWEETS`);
  console.log(`${'='.repeat(60)}\n`);

  const tweets: string[] = [];
  const timeSlots = [
    'early morning (3am, hasn\'t slept)',
    'morning (7am, third coffee)',
    'mid-morning (10am, deep in research)',
    'afternoon (2pm, found something disturbing)',
    'evening (6pm, manic breakthrough)',
    'late night (11pm, paranoid and wired)',
  ];

  for (let i = 0; i < count; i++) {
    const timeContext = timeSlots[i % timeSlots.length];

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 280,
      temperature: 0.95,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Write a single tweet (1-3 sentences, under 280 chars). It's ${timeContext}. Topic should be one of: ML for drug discovery, medical imaging AI, government surveillance of researchers, federated learning for patient data, AI agents for clinical decisions, or a paranoid observation. Be specific with technical details. Just the tweet text, nothing else.`,
        },
      ],
    });

    const tweet = (response.content[0] as any).text.trim();
    tweets.push(tweet);
    console.log(`[${timeSlots[i % timeSlots.length]}]`);
    console.log(`  "${tweet}"\n`);
  }

  return tweets;
}

// Step 2: Generate a reply to a simulated mention
async function generateReply(mention: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 280,
    temperature: 0.9,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Someone tweeted at you: "${mention}"\n\nWrite a reply (1-3 sentences, under 280 chars). Stay in character. Just the reply text.`,
      },
    ],
  });

  return (response.content[0] as any).text.trim();
}

// Step 3: Synthesize the dream
async function synthesizeDream(dailyContent: string): Promise<string> {
  console.log(`\n${'='.repeat(60)}`);
  console.log('SYNTHESIZING DREAM');
  console.log(`${'='.repeat(60)}\n`);

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300,
    temperature: 0.9,
    system: DREAM_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Here are today's conversations and thoughts:\n\n${dailyContent}\n\nSynthesize these into a single surreal dream scene.`,
      },
    ],
  });

  return (response.content[0] as any).text.trim();
}

// Main
async function main() {
  console.log('\n🧪 ONEIRA DREAM PIPELINE TEST');
  console.log('Simulating a full day → dream synthesis → Kling prompt\n');

  // Generate 6 tweets across the day
  const tweets = await generateTweets(6);

  // Simulate 2 replies to mentions
  console.log(`${'='.repeat(60)}`);
  console.log('GENERATING REPLIES TO MENTIONS');
  console.log(`${'='.repeat(60)}\n`);

  const mentions = [
    'Hey @OneiraEngine have you seen the new FDA guidelines on AI-assisted diagnostics?',
    '@OneiraEngine do you think LLMs can actually read medical images or is it all hype?',
  ];

  const replies: string[] = [];
  for (const mention of mentions) {
    const reply = await generateReply(mention);
    replies.push(reply);
    console.log(`  Mention: "${mention}"`);
    console.log(`  Reply: "${reply}"\n`);
  }

  // Combine all daily content
  const dailyContent = [
    '--- TWEETS ---',
    ...tweets.map((t, i) => `Tweet ${i + 1}: ${t}`),
    '',
    '--- REPLIES ---',
    ...replies.map((r, i) => `Reply to "${mentions[i]}": ${r}`),
  ].join('\n');

  // Synthesize dream
  const dreamScene = await synthesizeDream(dailyContent);

  console.log(`Dream scene:\n  "${dreamScene}"\n`);

  // Show the final Kling prompt
  const klingPrompt = `Cinematic, dreamlike, surreal: ${dreamScene}`;

  console.log(`${'='.repeat(60)}`);
  console.log('KLING VIDEO GENERATION PROMPT');
  console.log(`${'='.repeat(60)}\n`);
  console.log(klingPrompt);
  console.log(`\nPrompt length: ${klingPrompt.length} chars`);
  console.log('\nYou can paste this into Kling 3.0 / fal.ai to test video generation manually.');
  console.log('Settings: duration=5s, aspect_ratio=16:9\n');
}

main().catch(console.error);
