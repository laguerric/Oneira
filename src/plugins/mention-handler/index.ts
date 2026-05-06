import { Plugin } from '@elizaos/core';
import { MentionPollerService } from './services/mentionPoller.ts';
import { TweetSearchPollerService } from './services/tweetSearchPoller.ts';
import { mentionReplyAction } from './actions/mentionReplyAction.ts';

/**
 * Custom mention handler plugin using X API v2 with proper since_id tracking
 * Features:
 * - Persistent since_id tracking (fixes the reload bug)
 * - Automated reply to all mentions
 * - Tweet search and engagement for agent interests
 * - Prevents duplicate replies
 */
const mentionHandlerPlugin: Plugin = {
  name: 'plugin-mention-handler',
  description:
    'Complete mention and tweet search handler with persistent polling and automated replies',
  services: [MentionPollerService, TweetSearchPollerService],
  actions: [mentionReplyAction],
};

export default mentionHandlerPlugin;
