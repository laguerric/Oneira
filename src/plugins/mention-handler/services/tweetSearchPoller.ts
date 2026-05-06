import { Service, IAgentRuntime, logger } from '@elizaos/core';
import { TwitterApi } from 'twitter-api-v2';

export class TweetSearchPollerService extends Service {
  static serviceType = 'tweet-search-poller';
  private interval: NodeJS.Timeout | null = null;
  private twitterClient: TwitterApi | null = null;
  private isProcessing = false;
  private searchTerms: string[] = [];
  private lastSearchIds: Map<string, string> = new Map(); // Track last ID per search term

  constructor(runtime: IAgentRuntime) {
    super(runtime);
  }

  static async start(runtime: IAgentRuntime): Promise<TweetSearchPollerService> {
    logger.info('[TweetSearchPoller] Starting tweet search service');
    const service = new TweetSearchPollerService(runtime);
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
        logger.warn('[TweetSearchPoller] Missing Twitter OAuth credentials - search disabled');
        return;
      }

      this.twitterClient = new TwitterApi({
        appKey: apiKey,
        appSecret: apiSecret,
        accessToken,
        accessSecret,
      });

      // Get search terms from character topics
      const character = (this.runtime as any).character;
      this.searchTerms = character?.topics || [];

      if (this.searchTerms.length === 0) {
        logger.warn('[TweetSearchPoller] No topics found in character config');
        return;
      }

      logger.info(
        `[TweetSearchPoller] Initialized with ${this.searchTerms.length} search terms`
      );

      // Load last search IDs from memory
      await this.loadLastSearchIds();

      // Start polling every 30 minutes
      const intervalMinutes = parseInt(
        process.env.TWITTER_SEARCH_INTERVAL || '30', 10
      ) || 30;
      const intervalMs = intervalMinutes * 60 * 1000;

      this.interval = setInterval(() => {
        this.pollSearchTerms().catch((error) => {
          logger.error('[TweetSearchPoller] Poll error:', error);
        });
      }, intervalMs);

      logger.info(
        `[TweetSearchPoller] Checking every ${intervalMinutes} minutes`
      );

      // Run initial poll after a 5-minute delay to avoid overload on startup
      setTimeout(() => {
        this.pollSearchTerms().catch((error) => {
          logger.error('[TweetSearchPoller] Initial poll error:', error);
        });
      }, 5 * 60 * 1000);
    } catch (error) {
      logger.error('[TweetSearchPoller] Init error:', error);
    }
  }

  private async loadLastSearchIds(): Promise<void> {
    try {
      const stateKey = 'tweet-search-state';
      const savedState = await this.runtime.getMemoryById(stateKey);

      if (savedState?.content?.lastSearchIds) {
        this.lastSearchIds = new Map(
          Object.entries(savedState.content.lastSearchIds as Record<string, string>)
        );
        logger.debug('[TweetSearchPoller] Loaded last search IDs from memory');
      }
    } catch (error) {
      logger.debug('[TweetSearchPoller] No saved search state found');
    }
  }

  private async saveLastSearchIds(): Promise<void> {
    try {
      const stateKey = 'tweet-search-state';
      const searchIdsObj = Object.fromEntries(this.lastSearchIds);

      const existingState = await this.runtime.getMemoryById(stateKey);

      if (existingState) {
        existingState.content = {
          lastSearchIds: searchIdsObj,
          updatedAt: new Date().toISOString(),
        };
        await this.runtime.updateMemory(existingState);
      } else {
        await this.runtime.addMemory({
          id: stateKey,
          content: {
            lastSearchIds: searchIdsObj,
            updatedAt: new Date().toISOString(),
          },
          agentId: this.runtime.agentId,
          createdAt: Date.now(),
        });
      }
    } catch (error) {
      logger.error('[TweetSearchPoller] Error saving search state:', error);
    }
  }

  private async pollSearchTerms(): Promise<void> {
    if (this.isProcessing || !this.twitterClient || this.searchTerms.length === 0) {
      return;
    }

    this.isProcessing = true;
    try {
      logger.info('[TweetSearchPoller] Starting search polling...');

      // Search for each topic (rotate to avoid API limits)
      const searchTerm = this.searchTerms[
        Math.floor(Math.random() * this.searchTerms.length)
      ];

      await this.searchAndProcess(searchTerm);

      await this.saveLastSearchIds();
      logger.info('[TweetSearchPoller] Poll complete');
    } catch (error) {
      logger.error('[TweetSearchPoller] Error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async searchAndProcess(searchTerm: string): Promise<void> {
    try {
      logger.debug(`[TweetSearchPoller] Searching for: "${searchTerm}"`);

      const queryParams: Record<string, any> = {
        query: `"${searchTerm}" -is:reply lang:en`,
        max_results: 10,
        'tweet.fields':
          'created_at,public_metrics,author_id,conversation_id',
        'user.fields': 'username,name,id,public_metrics',
      };

      // Add since_id if we have a saved one for this term
      const lastId = this.lastSearchIds.get(searchTerm);
      if (lastId) {
        queryParams.since_id = lastId;
      }

      const response = await this.twitterClient!.v2.search(queryParams);

      if (!response.data || response.data.length === 0) {
        logger.debug(
          `[TweetSearchPoller] No new tweets for "${searchTerm}"`
        );
        return;
      }

      logger.info(
        `[TweetSearchPoller] Found ${response.data.length} tweets for "${searchTerm}"`
      );

      // Update last ID
      if (response.meta?.newest_id) {
        this.lastSearchIds.set(searchTerm, response.meta.newest_id);
      }

      // Process tweets in reverse order (oldest first)
      const tweetsInOrder = [...response.data].reverse();
      for (const tweet of tweetsInOrder) {
        await this.processTweet(tweet, searchTerm);
      }
    } catch (error) {
      logger.error(
        `[TweetSearchPoller] Error searching for "${searchTerm}":`,
        error
      );
    }
  }

  private async processTweet(tweet: any, searchTerm: string): Promise<void> {
    try {
      const tweetId = tweet.id;
      const username = tweet.author?.username || 'unknown';
      const engagementScore = (tweet.public_metrics?.like_count || 0) +
        (tweet.public_metrics?.retweet_count || 0) * 2;

      // Only engage with tweets that have reasonable engagement
      // (to avoid low-signal content)
      if (engagementScore < 2 && Math.random() > 0.1) {
        logger.debug(
          `[TweetSearchPoller] Skipping low-engagement tweet from @${username}`
        );
        return;
      }

      // Check if we've already processed this tweet
      const processedMemoryId = `tweet-search-${tweetId}`;
      const existingProcessed = await this.runtime.getMemoryById(
        processedMemoryId
      );

      if (existingProcessed) {
        logger.debug(
          `[TweetSearchPoller] Already processed tweet ${tweetId}`
        );
        return;
      }

      logger.info(
        `[TweetSearchPoller] From @${username}: "${tweet.text?.substring(0, 60)}..."`
      );

      // Emit event for mention response handler
      await this.runtime.emitEvent('TWEET_DISCOVERED', {
        tweetId,
        userId: tweet.author_id,
        username,
        text: tweet.text,
        createdAt: tweet.created_at,
        conversationId: tweet.conversation_id,
        searchTerm,
        engagementScore,
      } as any);

      // Save processed memory
      await this.runtime.addMemory({
        id: processedMemoryId,
        content: {
          tweetId,
          username,
          searchTerm,
          processedAt: new Date().toISOString(),
        },
        agentId: this.runtime.agentId,
        createdAt: Date.now(),
      });

      logger.info(
        `[TweetSearchPoller] Queued tweet ${tweetId} from @${username}`
      );
    } catch (error) {
      logger.error('[TweetSearchPoller] Process tweet error:', error);
    }
  }

  async stop(): Promise<void> {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      logger.info('[TweetSearchPoller] Stopped');
    }
  }
}
