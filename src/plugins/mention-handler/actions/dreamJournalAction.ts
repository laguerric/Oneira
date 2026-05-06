import { Action, ActionResult, HandlerCallback, IAgentRuntime, Memory, State, logger } from '@elizaos/core';
import { NightmareSeverityTrackerService } from '../services/nightmareSeverityTracker';
import { SleepQualityIntegrationService } from '../services/sleepQualityIntegration';

export const dreamJournalAction: Action = {
  name: 'DREAM_JOURNAL',
  similes: ['LOG_DREAM', 'RECORD_NIGHTMARE', 'JOURNAL_DREAM', 'ANALYZE_DREAM'],
  description: 'Journal and analyze dreams with AI insights and sleep correlation',

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    // Check if message contains dream content
    const text = message.content?.text?.toLowerCase() || '';
    const dreamKeywords = [
      'dream',
      'dreamed',
      'nightmare',
      'slept',
      'sleeping',
      'last night',
      'woke up',
    ];

    return dreamKeywords.some((keyword) => text.includes(keyword));
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: any,
    callback: HandlerCallback
  ): Promise<ActionResult> => {
    try {
      const userId = message.userId || 'unknown';
      const dreamDescription = message.content?.text || '';

      logger.info(`[DreamJournal] Processing dream journal entry for user ${userId}`);

      // Get services
      const nightmareTracker = runtime.getService<NightmareSeverityTrackerService>(
        'nightmare-severity-tracker'
      );
      const sleepIntegration = runtime.getService<SleepQualityIntegrationService>(
        'sleep-quality-integration'
      );

      if (!nightmareTracker) {
        logger.warn('[DreamJournal] Nightmare tracker service not found');
        await callback({
          text: 'Dream tracking service not available',
          error: true,
        });
        return {
          success: false,
          text: 'Dream tracking service not available',
        };
      }

      // Extract emotional response (ask if it's a nightmare)
      const isNightmare = dreamDescription.toLowerCase().includes('nightmare');
      const emotionalResponse = extractEmotionalContent(dreamDescription);
      const physicalReactions = extractPhysicalReactions(dreamDescription);
      const traumaContext = extractTraumaContext(dreamDescription);

      // Analyze nightmare severity
      const nightmareAnalysis = await nightmareTracker.analyzeNightmare({
        userId,
        dreamDescription,
        emotionalResponse,
        physicalReactions,
        traumaContext,
      });

      // Get sleep correlations if service is available
      let sleepInsights: string[] = [];
      let sleepOptimization: any = null;

      if (sleepIntegration) {
        try {
          const correlation = await sleepIntegration.correlateNightmareWithSleep({
            userId,
            nightmareId: nightmareAnalysis.id,
            nightmareSeverity: nightmareAnalysis.severityScore,
            nightmareDate: nightmareAnalysis.timestamp.toISOString(),
          });

          sleepInsights = correlation.insights;

          // Get optimization plan
          const nightmareHistory = [nightmareAnalysis]; // In production, would fetch full history
          sleepOptimization = await sleepIntegration.getSleepOptimizationPlan(
            userId,
            nightmareHistory
          );
        } catch (error) {
          logger.warn('[DreamJournal] Error getting sleep correlations:', error);
        }
      }

      // Build comprehensive response
      const response = buildDreamResponse({
        nightmare: nightmareAnalysis,
        sleepInsights,
        sleepOptimization,
        isNightmare,
      });

      logger.info(
        `[DreamJournal] Analyzed dream - Severity: ${nightmareAnalysis.severityScore}/10`
      );

      // Send callback with human-friendly response
      await callback({
        text: response.summary,
        action: 'DREAM_JOURNAL',
      });

      // Return detailed result
      return {
        success: true,
        text: `Dream analyzed - Severity: ${nightmareAnalysis.severityScore}/10`,
        values: {
          dreamId: nightmareAnalysis.id,
          severity: nightmareAnalysis.severityScore,
          emotionalThemes: nightmareAnalysis.emotionalThemes,
          traumaRelated: nightmareAnalysis.traumaRelated,
          sleepCorrelations: sleepInsights.length > 0,
        },
        data: {
          actionName: 'DREAM_JOURNAL',
          analysis: {
            nightmare: nightmareAnalysis,
            sleep: sleepOptimization,
            response,
          },
        },
      };
    } catch (error) {
      logger.error('[DreamJournal] Error:', error);

      await callback({
        text: `Error processing dream: ${error instanceof Error ? error.message : String(error)}`,
        error: true,
      });

      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        text: 'Failed to analyze dream',
      };
    }
  },

  examples: [
    [
      {
        name: 'user',
        content: {
          text: 'I had a nightmare last night. I was being chased and couldn\'t escape. My heart was racing and I woke up terrified and couldn\'t fall back asleep for an hour.',
        },
      },
      {
        name: 'Oneira',
        content: {
          text: 'I\'ve recorded your nightmare. Severity: 7/10. Key themes: chase, powerlessness. Consider discussing lucid dreaming techniques with your therapist.',
        },
      },
    ],
    [
      {
        name: 'user',
        content: {
          text: 'Dreamed about flying over mountains. Felt peaceful and in control. Woke up refreshed.',
        },
      },
      {
        name: 'Oneira',
        content: {
          text: 'Positive dream recorded! Themes: mastery, freedom, peace. Your good emotional state may correlate with quality REM sleep.',
        },
      },
    ],
  ],
};

// Helper functions

function extractEmotionalContent(dreamDescription: string): string {
  const emotionPatterns: Record<string, string[]> = {
    fear: ['scared', 'afraid', 'terrified', 'fear', 'panic', 'horror'],
    peace: ['peaceful', 'calm', 'serene', 'content', 'happy'],
    frustration: ['angry', 'frustrated', 'furious', 'enraged'],
    sadness: ['sad', 'crying', 'depressed', 'lonely', 'grief'],
    confusion: ['confused', 'disoriented', 'lost', 'bewildered'],
  };

  const text = dreamDescription.toLowerCase();
  const emotions: string[] = [];

  Object.entries(emotionPatterns).forEach(([emotion, keywords]) => {
    if (keywords.some((kw) => text.includes(kw))) {
      emotions.push(emotion);
    }
  });

  return emotions.length > 0
    ? `Emotions detected: ${emotions.join(', ')}`
    : 'Mixed emotional content';
}

function extractPhysicalReactions(dreamDescription: string): string[] {
  const reactions: string[] = [];

  const physicalPatterns: Record<string, string[]> = {
    'racing heart': ['heart racing', 'pounding heart', 'rapid heartbeat'],
    sweating: ['sweating', 'sweat', 'cold sweat'],
    'shortness of breath': ['couldn\'t breathe', 'breathing hard', 'breathless'],
    'muscle tension': ['tense', 'tight muscles', 'clenched'],
    'waking up': ['woke up', 'jolted awake', 'sudden waking'],
  };

  const text = dreamDescription.toLowerCase();

  Object.entries(physicalPatterns).forEach(([reaction, keywords]) => {
    if (keywords.some((kw) => text.includes(kw))) {
      reactions.push(reaction);
    }
  });

  return reactions;
}

function extractTraumaContext(dreamDescription: string): string | undefined {
  const traumaKeywords = [
    'ptsd',
    'trauma',
    'accident',
    'injury',
    'assault',
    'attack',
    'war',
    'combat',
    'abuse',
  ];

  const text = dreamDescription.toLowerCase();

  for (const keyword of traumaKeywords) {
    if (text.includes(keyword)) {
      return keyword;
    }
  }

  return undefined;
}

interface DreamResponseParams {
  nightmare: any;
  sleepInsights: string[];
  sleepOptimization: any;
  isNightmare: boolean;
}

function buildDreamResponse(params: DreamResponseParams): {
  summary: string;
  detailed: string;
} {
  const { nightmare, sleepInsights, sleepOptimization, isNightmare } = params;

  let summary = '';

  if (isNightmare) {
    summary = `I've recorded your nightmare (Severity: ${nightmare.severityScore}/10). `;

    if (nightmare.analysis.severityLevel === 'Severe') {
      summary += '**This was a significant nightmare.** ';
    } else if (nightmare.analysis.severityLevel === 'Moderate') {
      summary += 'This was a moderate nightmare. ';
    } else {
      summary += 'This was a mild nightmare. ';
    }

    summary += `\n\n**Emotional themes:** ${nightmare.emotionalThemes.join(', ') || 'mixed'}\n`;

    if (nightmare.physicalSymptoms.length > 0) {
      summary += `**Physical reactions:** ${nightmare.physicalSymptoms.join(', ')}\n`;
    }

    if (nightmare.traumaRelated) {
      summary += `\n⚠️ **Trauma-related content detected.** Imagery Rehearsal Therapy (IRT) and lucid dreaming have strong evidence for trauma nightmares.\n`;
    }

    summary += `\n**Status vs. previous:** ${nightmare.analysis.comparisonToPrevious}\n`;
  } else {
    summary = `I've recorded your dream. `;
    if (nightmare.emotionalThemes.length > 0) {
      summary += `Themes: ${nightmare.emotionalThemes.join(', ')}\n`;
    }
  }

  // Add sleep insights
  if (sleepInsights.length > 0) {
    summary += `\n**Sleep insights:**\n`;
    sleepInsights.forEach((insight) => {
      summary += `• ${insight}\n`;
    });
  }

  // Add recommendations
  if (nightmare.recommendations && nightmare.recommendations.length > 0) {
    summary += `\n**Recommendations:**\n`;
    nightmare.recommendations.slice(0, 3).forEach((rec: string) => {
      summary += `• ${rec}\n`;
    });
  }

  // Add sleep optimization if available
  if (sleepOptimization) {
    summary += `\n**Sleep optimization:** ${sleepOptimization.expectedImprovement}\n`;
    summary += `Optimal bedtime: ${sleepOptimization.optimalSleepWindow}\n`;
  }

  summary += `\n📊 Keep journaling - patterns emerge over time with consistent tracking.`;

  return {
    summary,
    detailed: JSON.stringify(
      {
        nightmare,
        sleepInsights,
        sleepOptimization,
      },
      null,
      2
    ),
  };
}
