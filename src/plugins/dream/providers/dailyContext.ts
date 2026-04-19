import { type IAgentRuntime, type Provider, type ProviderResult, type Memory, type State, logger } from '@elizaos/core';

/**
 * Pulls today's tweets and conversations from the ElizaOS memory system
 * to provide context for the nightly dream synthesis.
 */
export const dailyContextProvider: Provider = {
  name: 'DAILY_CONTEXT',
  description: 'Retrieves the day\'s tweets and conversations for dream synthesis',

  get: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state: State
  ): Promise<ProviderResult> => {
    const now = Date.now();
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

    try {
      // Get all memories from the last 24 hours across all rooms
      const recentMemories = await runtime.getMemories({
        tableName: 'messages',
        count: 200,
        unique: false,
      });

      // Filter to last 24 hours
      const todaysMemories = recentMemories.filter((m: Memory) => {
        const createdAt = m.createdAt ? new Date(m.createdAt).getTime() : 0;
        return createdAt >= twentyFourHoursAgo;
      });

      if (todaysMemories.length === 0) {
        logger.info('[DreamPlugin] No memories found for today');
        return {
          text: 'A quiet day. No conversations to dream about.',
          values: { memoryCount: 0 },
          data: { memories: [] },
        };
      }

      // Extract text content from memories
      const conversations = todaysMemories
        .map((m: Memory) => m.content?.text)
        .filter(Boolean);

      const summary = conversations.join('\n---\n');

      logger.info(`[DreamPlugin] Found ${conversations.length} memories for dream synthesis`);

      return {
        text: summary,
        values: { memoryCount: conversations.length },
        data: { memories: conversations },
      };
    } catch (error) {
      logger.error({ error }, '[DreamPlugin] Error fetching daily context');
      return {
        text: 'The memories are hazy today. Dreaming from fragments.',
        values: { memoryCount: 0, error: true },
        data: { memories: [] },
      };
    }
  },
};
