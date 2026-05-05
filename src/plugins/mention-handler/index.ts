import { Plugin } from '@elizaos/core';
import { MentionPollerService } from './services/mentionPoller.ts';

/**
 * Custom mention handler plugin using X API v2 with proper since_id tracking
 * Bypasses the broken lastCheckedTweetId logic in plugin-twitter
 */
const mentionHandlerPlugin: Plugin = {
  name: 'plugin-mention-handler',
  description: 'Custom mention polling service using X API v2 with proper since_id tracking',
  services: [MentionPollerService],
};

export default mentionHandlerPlugin;
