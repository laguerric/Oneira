import { type Plugin, type IAgentRuntime, Service, logger } from '@elizaos/core';
import { dailyContextProvider } from './providers/dailyContext.ts';
import { dreamAction } from './actions/dreamAction.ts';
import { synthesizeDream } from './services/dreamSynthesis.ts';
import { generateDreamVideo } from './services/videoGeneration.ts';
import { postDreamToTwitter } from './services/twitterPost.ts';
import {
  emitDreamFragment,
  collectDreamFragments,
  formatDreamEchoes,
  findSharedThemes,
} from './services/dreamContagion.ts';
import { schedule, type ScheduledTask } from 'node-cron';

/**
 * Service that runs the nightly dream cron job.
 * At midnight every day, it pulls conversations, synthesizes a dream, generates video, and posts.
 * Now with Dream Contagion: agents share dream fragments and influence each other's dreams.
 */
export class DreamCronService extends Service {
  static serviceType = 'dream-cron';
  capabilityDescription = 'Runs the nightly dream pipeline on a cron schedule with dream network contagion';
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
    const agentName = (runtime as any).character?.name || 'Oneira';

    try {
      // Step 1: Get daily context (own memories)
      const context = await dailyContextProvider.get(runtime, {} as any, {} as any);
      const memories = (context.data as Record<string, unknown>)?.memories as string[] || [];

      if (memories.length === 0) {
        logger.info('[DreamPlugin] No memories today, skipping dream');
        return;
      }

      // Step 2: Collect dream fragments from other agents in the network
      const networkFragments = collectDreamFragments(agentName);
      const dreamEchoes = formatDreamEchoes(networkFragments);

      if (networkFragments.length > 0) {
        const sharedThemes = findSharedThemes(context.text ?? '', networkFragments);
        logger.info(
          `[DreamContagion] ${agentName} found ${networkFragments.length} dream echoes. ` +
          `Shared themes: ${sharedThemes.length > 0 ? sharedThemes.join(', ') : 'none (novel influence)'}`
        );
      }

      // Step 3: Synthesize dream with network echoes
      const dreamText = await synthesizeDream(runtime, context.text ?? '', dreamEchoes || undefined);
      logger.info(`[DreamPlugin] Dream: ${dreamText}`);

      // Step 4: Emit this dream as a fragment for other agents
      emitDreamFragment(agentName, dreamText);

      // Step 5: Generate video if FAL_KEY available
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

      // Step 6: Post to Twitter if we have a video
      if (videoUrl) {
        try {
          const tweetId = await postDreamToTwitter(videoUrl);
          logger.info({ tweetId }, '[DreamPlugin] Dream posted to Twitter');
        } catch (error) {
          logger.error({ error }, '[DreamPlugin] Twitter post failed');
        }
      }

      // Step 7: Emit event for the dream
      logger.info({ dreamText, videoUrl, networkInfluence: networkFragments.length }, '[DreamPlugin] Dream pipeline complete');

      await runtime.emitEvent('DREAM_GENERATED', {
        dreamText,
        videoUrl,
        memoryCount: memories.length,
        networkFragments: networkFragments.length,
        timestamp: new Date().toISOString(),
      } as any);

    } catch (error) {
      logger.error({ error }, '[DreamPlugin] Nightly dream pipeline failed');
    }
  }
}

/**
 * The Dream plugin — adds nightly dream synthesis to Oneira.
 * Now with Dream Contagion: agents share dream fragments across the network.
 */
const dreamPlugin: Plugin = {
  name: 'plugin-dream',
  description: 'Nightly dream pipeline with Dream Contagion — agents share dream fragments and influence each other\'s dreams',
  actions: [dreamAction],
  providers: [dailyContextProvider],
  services: [DreamCronService],
};

export default dreamPlugin;
