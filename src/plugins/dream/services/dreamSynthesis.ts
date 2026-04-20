import { type IAgentRuntime, ModelType, logger } from '@elizaos/core';

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

/**
 * Takes the day's conversations and synthesizes them into a surreal dream paragraph
 * using the LLM via ElizaOS runtime.
 */
export async function synthesizeDream(
  runtime: IAgentRuntime,
  dailyConversations: string
): Promise<string> {
  logger.info('[DreamPlugin] Synthesizing dream from daily conversations...');

  const prompt = `${DREAM_SYSTEM_PROMPT}\n\nHere are today's conversations and thoughts:\n\n${dailyConversations}\n\nSynthesize these into a single surreal dream scene.`;

  try {
    const dreamText = await runtime.useModel(ModelType.TEXT_LARGE, {
      prompt,
      temperature: 0.9,
      maxTokens: 300,
    });

    if (!dreamText || typeof dreamText !== 'string') {
      throw new Error('Empty dream synthesis response');
    }

    logger.info(`[DreamPlugin] Dream synthesized: ${dreamText.substring(0, 100)}...`);
    return dreamText.trim();
  } catch (error) {
    logger.error({ error }, '[DreamPlugin] Dream synthesis failed');
    return 'A corridor of dissolving clocks stretches toward a horizon made of whispered questions. The floor is warm, like sunlight remembered through closed eyes.';
  }
}
