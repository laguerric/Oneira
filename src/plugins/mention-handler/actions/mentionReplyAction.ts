import { Action, ActionResult, HandlerCallback, IAgentRuntime, Memory, State, logger } from '@elizaos/core';
import { TwitterApi } from 'twitter-api-v2';
import { randomUUID } from 'crypto';

export const mentionReplyAction: Action = {
  name: 'MENTION_REPLY',
  similes: ['REPLY_TO_MENTION', 'RESPOND_TO_MENTION'],
  description: 'Reply to a mention on Twitter with an in-character response',

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    // Validate message has mention data
    if (!message.content?.tweetId || !message.content?.username) {
      return false;
    }

    // Check if we've already replied to this mention
    const replyMemoryId = `mention-reply-${message.content.tweetId}`;
    const existingReply = await runtime.getMemoryById(replyMemoryId);

    return !existingReply; // Only valid if we haven't replied yet
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: any,
    callback: HandlerCallback
  ): Promise<ActionResult> => {
    try {
      const tweetId = message.content?.tweetId;
      const username = message.content?.username;
      const mentionText = message.content?.text;

      logger.info(`[MentionReply] Generating response to @${username}'s mention`);

      // Generate response using the agent's model
      const responseText = await generateMentionResponse(runtime, {
        username,
        mentionText,
      });

      if (!responseText) {
        throw new Error('Failed to generate response');
      }

      logger.info(`[MentionReply] Generated response: "${responseText.substring(0, 100)}..."`);

      // Post reply to Twitter
      const postedTweet = await postReplyToTwitter(runtime, {
        tweetId,
        text: responseText,
      });

      if (!postedTweet) {
        throw new Error('Failed to post reply to Twitter');
      }

      // Save memory of reply
      const replyMemoryId = `mention-reply-${tweetId}`;
      await runtime.addMemory({
        id: replyMemoryId,
        content: {
          mentionTweetId: tweetId,
          username,
          mentionText,
          replyText: responseText,
          replyTweetId: postedTweet.data?.id,
          repliedAt: new Date().toISOString(),
        },
        agentId: runtime.agentId,
        createdAt: Date.now(),
      });

      logger.info(
        `[MentionReply] Successfully replied to @${username} (reply ID: ${postedTweet.data?.id})`
      );

      await callback({
        text: `Replied to @${username}'s mention`,
        action: 'MENTION_REPLY',
      });

      return {
        success: true,
        text: `Successfully replied to @${username}`,
        values: {
          mentionAuthor: username,
          originalTweet: tweetId,
          replyTweet: postedTweet.data?.id,
        },
        data: {
          actionName: 'MENTION_REPLY',
          tweetId,
          username,
          replyText: responseText,
        },
      };
    } catch (error) {
      logger.error('[MentionReply] Error:', error);

      await callback({
        text: `Failed to reply to mention: ${error instanceof Error ? error.message : String(error)}`,
        error: true,
      });

      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        text: `Failed to reply to mention`,
      };
    }
  },

  examples: [
    [
      {
        name: 'user',
        content: { text: '@Oneira what do you think about this?' },
      },
      {
        name: 'Oneira',
        content: { text: 'Interesting point. Here\'s what I think...' },
      },
    ],
  ],
};

async function generateMentionResponse(
  runtime: IAgentRuntime,
  context: { username: string; mentionText: string }
): Promise<string> {
  try {
    // Get character system prompt
    const character = (runtime as any).character;
    const systemPrompt = character?.system || '';

    // Build the prompt for generating a response
    const prompt = `You are ${character?.name || 'the agent'}.

${systemPrompt}

Someone mentioned you on Twitter:
@${context.username}: "${context.mentionText}"

Generate a brief, in-character reply (max 280 characters). Reply directly to their point. Be witty, paranoid, and brilliant. No hashtags, no emojis.`;

    // Use runtime to generate text
    const response = await runtime.generateText({
      context: prompt,
      modelType: 'text',
    });

    let generatedText = response?.trim() || '';

    // Ensure it fits in a tweet
    if (generatedText.length > 280) {
      generatedText = generatedText.substring(0, 277) + '...';
    }

    return generatedText;
  } catch (error) {
    logger.error('[MentionReply] Error generating response:', error);

    // Fallback response if generation fails
    const fallbacks = [
      'Interesting. Tell me more.',
      'I see what you\'re getting at.',
      'Fair point.',
      'Not wrong.',
    ];

    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
}

async function postReplyToTwitter(
  runtime: IAgentRuntime,
  context: { tweetId: string; text: string }
): Promise<any> {
  try {
    const apiKey = process.env.TWITTER_API_KEY;
    const apiSecret = process.env.TWITTER_API_SECRET_KEY;
    const accessToken = process.env.TWITTER_ACCESS_TOKEN;
    const accessSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;

    if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
      throw new Error('Missing Twitter credentials');
    }

    const twitterClient = new TwitterApi({
      appKey: apiKey,
      appSecret: apiSecret,
      accessToken,
      accessSecret,
    });

    // Post reply to the tweet
    const response = await twitterClient.v2.reply(context.text, {
      reply: {
        in_reply_to_tweet_id: context.tweetId,
      },
    });

    return response;
  } catch (error) {
    logger.error('[MentionReply] Error posting to Twitter:', error);
    throw error;
  }
}
