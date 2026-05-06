import { Plugin } from '@elizaos/core';
import { MentionPollerService } from './services/mentionPoller.ts';
import { TweetSearchPollerService } from './services/tweetSearchPoller.ts';
import { NightmareSeverityTrackerService } from './services/nightmareSeverityTracker.ts';
import { SleepQualityIntegrationService } from './services/sleepQualityIntegration.ts';
import { DreamBiomarkerDetectorService } from './services/dreamBiomarkerDetector.ts';
import { FDAClinicalTrialManagerService } from './services/fdaClinicalTrialManager.ts';
import { mentionReplyAction } from './actions/mentionReplyAction.ts';
import { dreamJournalAction } from './actions/dreamJournalAction.ts';

/**
 * Oneira: Therapeutic Dream Research Platform
 *
 * Features:
 * - Persistent mention polling with since_id tracking (fixes the reload bug)
 * - Automated reply to all mentions
 * - Tweet search and engagement for agent interests
 * - Nightmare severity analysis and tracking
 * - Sleep quality correlation with dream patterns
 * - Dream journaling with AI-generated therapeutic insights
 * - Research-grade dream data collection
 */
const mentionHandlerPlugin: Plugin = {
  name: 'plugin-mention-handler',
  description:
    'Oneira: Therapeutic dream research platform with clinical trial management and FDA-ready biomarker detection',
  services: [
    MentionPollerService,
    TweetSearchPollerService,
    NightmareSeverityTrackerService,
    SleepQualityIntegrationService,
    DreamBiomarkerDetectorService,
    FDAClinicalTrialManagerService,
  ],
  actions: [mentionReplyAction, dreamJournalAction],
};

export default mentionHandlerPlugin;
