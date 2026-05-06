import { PlatformAdapter, PlatformPost } from './basePlatformAdapter.ts';
import { logger } from '@elizaos/core';
import Parser from 'rss-parser';

export class RSSAdapter implements PlatformAdapter {
  platform = 'rss';
  private parser = new Parser();
  private feeds = [
    'https://pubmed.ncbi.nlm.nih.gov/feed/sleep/?limit=100&utm_source=curl&utm_medium=rss&utm_campaign=pubmed-full',
    'https://onlinelibrary.wiley.com/feed/13652869/most-recent',
    'https://jneuro.org/feed/',
  ];
  private lastChecked: Map<string, string> = new Map();
  private pollingInterval: NodeJS.Timeout | null = null;

  async connect(): Promise<void> {
    logger.info('[RSSAdapter] Connected - RSS feeds ready for polling');
  }

  async search(query: string, options?: any): Promise<PlatformPost[]> {
    const results: PlatformPost[] = [];

    for (const feedUrl of this.feeds) {
      try {
        const feed = await this.parser.parseURL(feedUrl);

        for (const item of feed.items || []) {
          if (
            (item.title && item.title.toLowerCase().includes(query.toLowerCase())) ||
            (item.content && item.content.toLowerCase().includes(query.toLowerCase()))
          ) {
            results.push({
              id: item.guid || item.link || '',
              platform: 'rss',
              author: item.creator || feed.title || 'Unknown',
              text: item.title || '',
              url: item.link || '',
              score: 0,
              createdAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
              metadata: { feed: feed.title, description: item.summary },
            });
          }
        }
      } catch (error) {
        logger.warn(`[RSSAdapter] Error parsing feed ${feedUrl}:`, error);
      }
    }

    return results;
  }

  async reply(postId: string, text: string): Promise<void> {
    logger.warn('[RSSAdapter] Reply not implemented - RSS is read-only');
  }

  monitor(keywords: string[], handler: (post: PlatformPost) => void): void {
    const interval = parseInt(process.env.RSS_POLL_INTERVAL || '360') * 60 * 1000; // default 6 hours

    this.pollingInterval = setInterval(async () => {
      for (const feedUrl of this.feeds) {
        try {
          const feed = await this.parser.parseURL(feedUrl);

          for (const item of feed.items || []) {
            const lastId = this.lastChecked.get(feedUrl);
            if (lastId === item.guid) break; // Stop at last checked item

            const text = ((item.title || '') + ' ' + (item.summary || '')).toLowerCase();
            if (keywords.some((kw) => text.includes(kw.toLowerCase()))) {
              handler({
                id: item.guid || item.link || '',
                platform: 'rss',
                author: item.creator || feed.title || 'Unknown',
                text: item.title || '',
                url: item.link || '',
                score: 0,
                createdAt: item.pubDate
                  ? new Date(item.pubDate).toISOString()
                  : new Date().toISOString(),
              });
            }
          }

          // Update last checked
          if (feed.items && feed.items.length > 0) {
            this.lastChecked.set(feedUrl, feed.items[0].guid || feed.items[0].link || '');
          }
        } catch (error) {
          logger.error(`[RSSAdapter] Error polling ${feedUrl}:`, error);
        }
      }
    }, interval);

    logger.info(`[RSSAdapter] Monitoring RSS feeds every ${interval / 60000} minutes`);
  }

  async disconnect(): Promise<void> {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    logger.info('[RSSAdapter] Disconnected');
  }
}
