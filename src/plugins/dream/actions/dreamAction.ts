import {
  type IAgentRuntime,
  type Action,
  type ActionResult,
  type HandlerCallback,
  type Memory,
  type State,
  logger,
} from '@elizaos/core';
import { dailyContextProvider } from '../providers/dailyContext.ts';
import { synthesizeDream } from '../services/dreamSynthesis.ts';
import { generateDreamVideo } from '../services/videoGeneration.ts';

/**
 * Manual trigger for the dream pipeline.
 * The cron-based automatic trigger lives in DreamCronService.
 * This action lets you test the pipeline by saying "dream now" or "trigger dream".
 */
export const dreamAction: Action = {
  name: 'TRIGGER_DREAM',
  similes: ['DREAM_NOW', 'GENERATE_DREAM', 'MAKE_DREAM'],
  description: 'Manually triggers the nightly dream pipeline — synthesizes daily conversations into a surreal video and posts it.',

  validate: async (_runtime: IAgentRuntime, message: Memory, _state: State): Promise<boolean> => {
    const text = message.content?.text?.toLowerCase() || '';
    return text.includes('dream now') || text.includes('trigger dream') || text.includes('generate dream');
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: any,
    callback: HandlerCallback,
    _responses: Memory[]
  ): Promise<ActionResult> => {
    try {
      logger.info('[DreamPlugin] Manual dream trigger activated');

      // Step 1: Get daily context
      await callback({ text: 'Gathering the day\'s memories...' });
      const context = await dailyContextProvider.get(runtime, message, state);
      const memories = (context.data as Record<string, unknown>)?.memories as string[] || [];

      if (memories.length === 0) {
        await callback({ text: 'A quiet day — nothing to dream about yet. The dream will come when there are conversations to weave.' });
        return { success: true, text: 'No memories to dream about' };
      }

      // Step 2: Synthesize dream
      await callback({ text: 'The dream is forming...' });
      const dreamText = await synthesizeDream(runtime, context.text ?? '');

      // Step 3: Generate video (if FAL_KEY is set)
      let videoUrl: string | null = null;
      if (process.env.FAL_KEY?.trim()) {
        await callback({ text: 'Rendering the dream into vision...' });
        try {
          videoUrl = await generateDreamVideo(dreamText);
        } catch (error) {
          logger.error({ error }, '[DreamPlugin] Video generation failed, posting text only');
        }
      }

      // Step 4: Post the dream
      const dreamPost = videoUrl
        ? dreamText
        : dreamText;

      await callback({
        text: dreamPost,
        ...(videoUrl ? { attachments: [{ id: 'dream-video', url: videoUrl, title: 'Tonight\'s dream' }] } : {}),
      });

      logger.info('[DreamPlugin] Dream posted successfully');

      return {
        success: true,
        text: 'Dream generated and posted',
        values: { dreamText, videoUrl, memoryCount: memories.length },
        data: { dreamText, videoUrl },
      };
    } catch (error) {
      logger.error({ error }, '[DreamPlugin] Dream pipeline failed');
      await callback({ text: 'The dream slipped away before I could catch it...' });
      return {
        success: false,
        text: 'Dream pipeline failed',
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      { name: '{{name1}}', content: { text: 'dream now' } },
      { name: 'Oneira', content: { text: 'Gathering the day\'s memories...', actions: ['TRIGGER_DREAM'] } },
    ],
  ],
};
