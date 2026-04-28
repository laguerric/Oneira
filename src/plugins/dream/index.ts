import { type Plugin, type IAgentRuntime, Service, logger } from '@elizaos/core';
import { dailyContextProvider } from './providers/dailyContext.ts';
import { dreamAction } from './actions/dreamAction.ts';
import { synthesizeDream } from './services/dreamSynthesis.ts';
import { generateDreamVideo } from './services/videoGeneration.ts';
import { postDreamToTwitter } from './services/twitterPost.ts';
import { schedule, type ScheduledTask } from 'node-cron';

/**
 * Service that runs the nightly dream cron job.
 * At midnight every day, it pulls conversations, synthesizes a dream, generates video, and posts.
 */
export class DreamCronService extends Service {
  static serviceType = 'dream-cron';
  capabilityDescription = 'Runs the nightly dream pipeline on a cron schedule';
  private cronTask: ScheduledTask | null = null;

  constructor(runtime: IAgentRuntime) {
    super(runtime);
  }

  static async start(runtime: IAgentRuntime): Promise<DreamCronService> {
    logger.info('[DreamPlugin] Starting dream cron service');
    const service = new DreamCronService(runtime);
    service.startCron();
    return service;
  }

  static async stop(runtime: IAgentRuntime): Promise<void> {
    const service = runtime.getService(DreamCronService.serviceType) as DreamCronService;
    if (service) {
      service.stopCron();
    }
  }

  private startCron(): void {
    // Run at midnight every day
    this.cronTask = schedule('0 0 * * *', async () => {
      logger.info('[DreamPlugin] Midnight dream cron triggered');
      await this.runDreamPipeline();
    });

    logger.info('[DreamPlugin] Dream cron scheduled for midnight daily');
  }

  private stopCron(): void {
    if (this.cronTask) {
      this.cronTask.stop();
      this.cronTask = null;
      logger.info('[DreamPlugin] Dream cron stopped');
    }
  }

  async stop(): Promise<void> {
    this.stopCron();
  }

  async runDreamPipeline(): Promise<void> {
    const runtime = this.runtime;

    try {
      // Step 1: Get daily context
      const context = await dailyContextProvider.get(runtime, {} as any, {} as any);
      const memories = (context.data as Record<string, unknown>)?.memories as string[] || [];

      if (memories.length === 0) {
        logger.info('[DreamPlugin] No memories today, skipping dream');
        return;
      }

      // Step 2: Synthesize dream text
      const dreamText = await synthesizeDream(runtime, context.text ?? '');
      logger.info(`[DreamPlugin] Dream: ${dreamText}`);

      // Step 3: Generate video if FAL_KEY available
      let videoUrl: string | null = null;
      if (process.env.FAL_KEY?.trim()) {
        try {
          videoUrl = await generateDreamVideo(dreamText);
        } catch (error) {
          logger.error({ error }, '[DreamPlugin] Video generation failed, posting text-only dream');
        }
      } else {
        logger.info('[DreamPlugin] No FAL_KEY set, posting text-only dream');
      }

      // Step 4: Post to Twitter if we have a video
      if (videoUrl) {
        try {
          const tweetId = await postDreamToTwitter(videoUrl);
          logger.info({ tweetId }, '[DreamPlugin] Dream posted to Twitter');
        } catch (error) {
          logger.error({ error }, '[DreamPlugin] Twitter post failed');
        }
      }

      // Step 5: Emit event for the dream
      logger.info({ dreamText, videoUrl }, '[DreamPlugin] Dream pipeline complete');

      await runtime.emitEvent('DREAM_GENERATED', {
        dreamText,
        videoUrl,
        memoryCount: memories.length,
        timestamp: new Date().toISOString(),
      } as any);

    } catch (error) {
      logger.error({ error }, '[DreamPlugin] Nightly dream pipeline failed');
    }
  }
}

/**
 * The Dream plugin — adds nightly dream synthesis to Oneira.
 */
const dreamPlugin: Plugin = {
  name: 'plugin-dream',
  description: 'Nightly dream pipeline: synthesizes daily conversations into surreal video dreams',
  actions: [dreamAction],
  providers: [dailyContextProvider],
  services: [DreamCronService],
};

export default dreamPlugin;
