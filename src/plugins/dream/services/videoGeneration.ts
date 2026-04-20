import { logger } from '@elizaos/core';
import { fal } from '@fal-ai/client';

/**
 * Generates a short dream video from a text description using Kling 3.0 via fal.ai.
 * Returns the URL of the generated video.
 */
export async function generateDreamVideo(dreamText: string): Promise<string> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    throw new Error('FAL_KEY environment variable is not set');
  }

  fal.config({ credentials: falKey });

  logger.info('[DreamPlugin] Generating dream video via fal.ai Kling 3.0...');
  logger.info(`[DreamPlugin] Prompt: ${dreamText.substring(0, 100)}...`);

  try {
    const result = await fal.subscribe('fal-ai/kling-video/v2/master/text-to-video', {
      input: {
        prompt: `Cinematic, dreamlike, surreal: ${dreamText}`,
        duration: 10,
        aspect_ratio: '16:9',
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === 'IN_PROGRESS') {
          logger.info(`[DreamPlugin] Video generation in progress...`);
        }
      },
    });

    const videoUrl = (result.data as any)?.video?.url;
    if (!videoUrl) {
      throw new Error('No video URL in fal.ai response');
    }

    logger.info(`[DreamPlugin] Dream video generated: ${videoUrl}`);
    return videoUrl;
  } catch (error) {
    logger.error({ error }, '[DreamPlugin] Video generation failed');
    throw error;
  }
}
