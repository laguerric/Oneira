import { PlatformAdapter, PlatformPost } from './basePlatformAdapter.ts';
import { logger } from '@elizaos/core';
import Snoowrap from 'snoowrap';

export class RedditAdapter implements PlatformAdapter {
  platform = 'reddit';
  private reddit: Snoowrap | null = null;
  private subreddits = ['Dreams', 'LucidDreaming', 'PTSD', 'SleepApnea', 'sleep'];
  private monitorInterval: NodeJS.Timeout | null = null;

  async connect(): Promise<void> {
    try {
      this.reddit = new Snoowrap({
        userAgent: process.env.REDDIT_USER_AGENT || 'oneira-research/1.0',
        clientId: process.env.REDDIT_CLIENT_ID,
        clientSecret: process.env.REDDIT_CLIENT_SECRET,
        refreshToken: process.env.REDDIT_REFRESH_TOKEN,
      });

      await this.reddit.getMe();
      logger.info('[RedditAdapter] Connected to Reddit');
    } catch (error) {
      logger.error('[RedditAdapter] Connection error:', error);
      throw error;
    }
  }

  async search(query: string, options?: any): Promise<PlatformPost[]> {
    if (!this.reddit) throw new Error('Reddit not connected');

    try {
      const results = await this.reddit.search({
        query,
        subreddit: options?.subreddit || 'Dreams',
        time: options?.time || 'week',
        sort: options?.sort || 'relevance',
      });

      return results.map((post: any) => ({
        id: post.id,
        platform: 'reddit',
        author: post.author?.name || 'unknown',
        text: post.title + '\n' + (post.selftext || ''),
        url: `https://reddit.com${post.permalink}`,
        score: post.score,
        createdAt: new Date(post.created_utc * 1000).toISOString(),
        metadata: { subreddit: post.subreddit, upvotes: post.ups, comments: post.num_comments },
      }));
    } catch (error) {
      logger.error('[RedditAdapter] Search error:', error);
      return [];
    }
  }

  async reply(postId: string, text: string): Promise<void> {
    if (!this.reddit) throw new Error('Reddit not connected');

    try {
      const submission = this.reddit.getSubmission(postId);
      await submission.reply(text);
      logger.info(`[RedditAdapter] Replied to ${postId}`);
    } catch (error) {
      logger.error('[RedditAdapter] Reply error:', error);
      throw error;
    }
  }

  monitor(keywords: string[], handler: (post: PlatformPost) => void): void {
    if (!this.reddit) throw new Error('Reddit not connected');

    this.monitorInterval = setInterval(async () => {
      try {
        for (const subreddit of this.subreddits) {
          const posts = await this.reddit!
            .getSubreddit(subreddit)
            .getNew({ limit: 10 });

          for (const post of posts) {
            const text = (post.title + ' ' + (post.selftext || '')).toLowerCase();
            if (keywords.some((kw) => text.includes(kw.toLowerCase()))) {
              handler({
                id: post.id,
                platform: 'reddit',
                author: post.author?.name || 'unknown',
                text: post.title,
                url: `https://reddit.com${post.permalink}`,
                score: post.score,
                createdAt: new Date(post.created_utc * 1000).toISOString(),
              });
            }
          }
        }
      } catch (error) {
        logger.error('[RedditAdapter] Monitor error:', error);
      }
    }, 15 * 60 * 1000); // 15 minutes
  }

  async disconnect(): Promise<void> {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }
    logger.info('[RedditAdapter] Disconnected');
  }
}
