import { Service, IAgentRuntime, logger } from '@elizaos/core';
import { TwitterApi } from 'twitter-api-v2';
import { randomUUID } from 'crypto';

export class MentionPollerService extends Service {
  static serviceType = 'mention-poller';
  private interval: NodeJS.Timeout | null = null;
  private twitterClient: TwitterApi | null = null;
  private lastMentionId: string | null = null;
  private isProcessing = false;
  private userId: string | null = null;

  constructor(runtime: IAgentRuntime) {
    super(runtime);
  }

  static async start(runtime: IAgentRuntime): Promise<MentionPollerService> {
    logger.info('[MentionPoller] Starting mention poller service');
    const service = new MentionPollerService(runtime);
    await service.initialize();
    return service;
  }

  async initialize(): Promise<void> {
    try {
      const apiKey = process.env.TWITTER_API_KEY;
      const apiSecret = process.env.TWITTER_API_SECRET_KEY;
      const accessToken = process.env.TWITTER_ACCESS_TOKEN;
      const accessSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;

      if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
        logger.error(
          '[MentionPoller] Missing Twitter OAuth credentials'
        );
        return;
      }

      this.twitterClient = new TwitterApi({
        appKey: apiKey,
        appSecret: apiSecret,
        accessToken,
        accessSecret,
      });

      const user = await this.twitterClient.v2.me({
        'user.fields': 'id,username',
      });

      if (!user.data?.id) {
        logger.error('[MentionPoller] Failed to get user ID');
        return;
      }

      this.userId = user.data.id;
      logger.info(
        `[MentionPoller] Authenticated as @${user.data.username}`
      );

      const stateKey = `mention-poller-state-${this.userId}`;
      const savedState = await this.runtime.getMemoryById(stateKey);
      if (savedState?.content?.lastMentionId) {
        this.lastMentionId = savedState.content.lastMentionId;
        logger.info(
          `[MentionPoller] Loaded last mention ID: ${this.lastMentionId}`
        );
      }

      const intervalMinutes = parseInt(
        process.env.TWITTER_MENTION_CHECK_INTERVAL || '3'
      );
      const intervalMs = intervalMinutes * 60 * 1000;

      this.interval = setInterval(() => {
        this.pollMentions().catch((error) => {
          logger.error('[MentionPoller] Poll error:', error);
        });
      }, intervalMs);

      logger.info(
        `[MentionPoller] Checking every ${intervalMinutes} minutes`
      );

      await this.pollMentions();
    } catch (error) {
      logger.error('[MentionPoller] Init error:', error);
    }
  }

  private async pollMentions(): Promise<void> {
    if (this.isProcessing || !this.twitterClient || !this.userId) {
      return;
    }

    this.isProcessing = true;
    try {
      logger.info('[MentionPoller] Polling mentions...');

      const queryParams: Record<string, any> = {
        'tweet.fields':
          'created_at,public_metrics,author_id,conversation_id,in_reply_to_user_id',
        'user.fields': 'username,name,id',
        max_results: 100,
      };

      if (this.lastMentionId) {
        queryParams.since_id = this.lastMentionId;
      }

      const response = await this.twitterClient.v2.userMentionTimeline(
        this.userId,
        queryParams
      );

      if (!response.data || response.data.length === 0) {
        logger.debug('[MentionPoller] No new mentions');
        this.isProcessing = false;
        return;
      }

      logger.info(
        `[MentionPoller] Found ${response.data.length} new mentions`
      );

      if (response.meta?.newest_id) {
        this.lastMentionId = response.meta.newest_id;

        const stateKey = `mention-poller-state-${this.userId}`;
        await this.runtime.addMemory({
          id: randomUUID(),
          content: {
            lastMentionId: this.lastMentionId,
            updatedAt: new Date().toISOString(),
          },
          agentId: this.runtime.agentId,
          createdAt: Date.now(),
        });

        logger.debug(
          `[MentionPoller] Updated lastMentionId to ${this.lastMentionId}`
        );
      }

      const tweetsInOrder = [...response.data].reverse();
      for (const tweet of tweetsInOrder) {
        await this.processMention(tweet);
      }

      logger.info('[MentionPoller] Poll complete');
    } catch (error) {
      logger.error('[MentionPoller] Error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processMention(tweet: any): Promise<void> {
    try {
      logger.info(
        `[MentionPoller] From @${tweet.username}: "${tweet.text?.substring(0, 60)}..."`
      );

      const mentionMemoryId = `mention-${tweet.id}`;
      const existingReply = await this.runtime.getMemoryById(mentionMemoryId);
      if (existingReply) {
        logger.debug(`[MentionPoller] Already replied to ${tweet.id}`);
        return;
      }

      await this.runtime.emitEvent('MENTION_DETECTED', {
        tweetId: tweet.id,
        userId: tweet.author_id,
        username: tweet.username,
        text: tweet.text,
        createdAt: tweet.created_at,
        conversationId: tweet.conversation_id,
      } as any);

      await this.runtime.addMemory({
        id: randomUUID(),
        content: {
          tweetId: tweet.id,
          username: tweet.username,
          processedAt: new Date().toISOString(),
        },
        agentId: this.runtime.agentId,
        createdAt: Date.now(),
      });

      logger.info(
        `[MentionPoller] Queued mention ${tweet.id} from @${tweet.username}`
      );
    } catch (error) {
      logger.error('[MentionPoller] Process mention error:', error);
    }
  }

  async stop(): Promise<void> {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      logger.info('[MentionPoller] Stopped');
    }
  }
}
