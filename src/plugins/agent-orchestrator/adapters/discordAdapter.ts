import { PlatformAdapter, PlatformPost } from './basePlatformAdapter.ts';
import { logger } from '@elizaos/core';
import { Client, GatewayIntentBits, ChannelType } from 'discord.js';

export class DiscordAdapter implements PlatformAdapter {
  platform = 'discord';
  private client: Client | null = null;
  private handlers: ((post: PlatformPost) => void)[] = [];

  async connect(): Promise<void> {
    try {
      this.client = new Client({
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
      });

      this.client.on('messageCreate', (message) => {
        if (message.author.bot) return;

        const post: PlatformPost = {
          id: message.id,
          platform: 'discord',
          author: message.author.username,
          text: message.content,
          url: message.url,
          score: message.reactions.cache.reduce((sum, r) => sum + r.count, 0),
          createdAt: message.createdAt.toISOString(),
          metadata: { channel: message.channelId, server: message.guildId },
        };

        this.handlers.forEach((handler) => handler(post));
      });

      await this.client.login(process.env.DISCORD_BOT_TOKEN);
      logger.info('[DiscordAdapter] Connected to Discord');
    } catch (error) {
      logger.error('[DiscordAdapter] Connection error:', error);
      throw error;
    }
  }

  async search(query: string, options?: any): Promise<PlatformPost[]> {
    logger.warn('[DiscordAdapter] Search not implemented - Discord adapter is listen-only');
    return [];
  }

  async reply(postId: string, text: string): Promise<void> {
    if (!this.client) throw new Error('Discord not connected');

    try {
      const channels = this.client.channels.cache.filter((c) => c.type === ChannelType.GuildText);
      for (const channel of channels.values()) {
        if ('messages' in channel) {
          try {
            const message = await channel.messages.fetch(postId);
            await message.reply(text);
            logger.info(`[DiscordAdapter] Replied to ${postId}`);
            return;
          } catch (e) {
            // Continue searching
          }
        }
      }
      throw new Error(`Message ${postId} not found`);
    } catch (error) {
      logger.error('[DiscordAdapter] Reply error:', error);
      throw error;
    }
  }

  monitor(keywords: string[], handler: (post: PlatformPost) => void): void {
    this.handlers.push((post) => {
      if (keywords.some((kw) => post.text.toLowerCase().includes(kw.toLowerCase()))) {
        handler(post);
      }
    });
    logger.info(`[DiscordAdapter] Monitoring ${keywords.length} keywords`);
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.destroy();
    }
    logger.info('[DiscordAdapter] Disconnected');
  }
}
