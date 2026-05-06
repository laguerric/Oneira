import { Service, IAgentRuntime, logger, Memory } from '@elizaos/core';

export interface NightmareEntry {
  id: string;
  timestamp: Date;
  dreamDescription: string;
  severityScore: number; // 1-10
  emotionalThemes: string[];
  physicalSymptoms: string[];
  wakefulnessLevel: number; // 1-5 (how hard to fall back asleep)
  traumaRelated: boolean;
  improvedSinceLast?: boolean;
}

export class NightmareSeverityTrackerService extends Service {
  static serviceType = 'nightmare-severity-tracker';
  private nightmareHistory: Map<string, NightmareEntry[]> = new Map();

  constructor(runtime: IAgentRuntime) {
    super(runtime);
  }

  static async start(runtime: IAgentRuntime): Promise<NightmareSeverityTrackerService> {
    logger.info('[NightmareTracker] Starting nightmare severity tracker service');
    const service = new NightmareSeverityTrackerService(runtime);
    await service.initialize();
    return service;
  }

  async initialize(): Promise<void> {
    try {
      // Load historical nightmare data from memory
      await this.loadNightmareHistory();
      logger.info('[NightmareTracker] Service initialized');
    } catch (error) {
      logger.error('[NightmareTracker] Init error:', error);
    }
  }

  /**
   * Analyze and log a nightmare
   * Returns severity score and therapeutic recommendations
   */
  async analyzeNightmare(params: {
    userId: string;
    dreamDescription: string;
    emotionalResponse: string;
    physicalReactions?: string[];
    traumaContext?: string;
  }): Promise<NightmareEntry & { analysis: any; recommendations: string[] }> {
    try {
      logger.info(`[NightmareTracker] Analyzing nightmare for user ${params.userId}`);

      // Extract emotional themes using AI
      const emotionalThemes = await this.extractEmotionalThemes(
        params.dreamDescription,
        params.emotionalResponse
      );

      // Assess severity
      const severityScore = await this.calculateSeverityScore({
        description: params.dreamDescription,
        emotionalThemes,
        physicalReactions: params.physicalReactions || [],
        traumaContext: params.traumaContext,
      });

      // Detect trauma-related content
      const traumaRelated = await this.detectTraumaContent(
        params.dreamDescription,
        params.traumaContext
      );

      // Get improvement metrics vs previous nightmares
      const userNightmares = this.nightmareHistory.get(params.userId) || [];
      const improvedSinceLast =
        userNightmares.length > 0
          ? severityScore < userNightmares[userNightmares.length - 1].severityScore
          : undefined;

      const entry: NightmareEntry = {
        id: `nightmare-${Date.now()}`,
        timestamp: new Date(),
        dreamDescription: params.dreamDescription,
        severityScore,
        emotionalThemes,
        physicalSymptoms: params.physicalReactions || [],
        wakefulnessLevel: await this.estimateWakefulness(params.emotionalResponse),
        traumaRelated,
        improvedSinceLast,
      };

      // Save to memory
      await this.saveNightmareEntry(params.userId, entry);

      // Generate therapeutic insights
      const analysis = await this.generateAnalysis(entry, userNightmares);
      const recommendations = await this.generateRecommendations(
        entry,
        analysis,
        userNightmares
      );

      logger.info(
        `[NightmareTracker] Severity: ${severityScore}/10, Trauma-related: ${traumaRelated}`
      );

      return {
        ...entry,
        analysis,
        recommendations,
      };
    } catch (error) {
      logger.error('[NightmareTracker] Analysis error:', error);
      throw error;
    }
  }

  /**
   * Get nightmare trends over time
   */
  async getNightmareTrends(userId: string, days: number = 30): Promise<{
    totalNightmares: number;
    averageSeverity: number;
    severityTrend: 'improving' | 'worsening' | 'stable';
    mostCommonThemes: string[];
    traumaRelatedPercentage: number;
    estimatedRecovery: string;
  }> {
    try {
      const userNightmares = this.nightmareHistory.get(userId) || [];
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const recentNightmares = userNightmares.filter(
        (n) => new Date(n.timestamp) > cutoffDate
      );

      if (recentNightmares.length === 0) {
        return {
          totalNightmares: 0,
          averageSeverity: 0,
          severityTrend: 'stable',
          mostCommonThemes: [],
          traumaRelatedPercentage: 0,
          estimatedRecovery: 'Insufficient data - keep tracking',
        };
      }

      const avgSeverity =
        recentNightmares.reduce((sum, n) => sum + n.severityScore, 0) /
        recentNightmares.length;

      // Trend analysis
      const firstHalf = recentNightmares.slice(0, Math.floor(recentNightmares.length / 2));
      const secondHalf = recentNightmares.slice(Math.floor(recentNightmares.length / 2));

      const firstHalfAvg =
        firstHalf.reduce((sum, n) => sum + n.severityScore, 0) / Math.max(firstHalf.length, 1);
      const secondHalfAvg =
        secondHalf.reduce((sum, n) => sum + n.severityScore, 0) / Math.max(secondHalf.length, 1);

      let trend: 'improving' | 'worsening' | 'stable' = 'stable';
      if (secondHalfAvg < firstHalfAvg * 0.9) trend = 'improving';
      if (secondHalfAvg > firstHalfAvg * 1.1) trend = 'worsening';

      // Theme analysis
      const themeFreq: Record<string, number> = {};
      recentNightmares.forEach((n) => {
        n.emotionalThemes.forEach((theme) => {
          themeFreq[theme] = (themeFreq[theme] || 0) + 1;
        });
      });

      const mostCommonThemes = Object.entries(themeFreq)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([theme]) => theme);

      const traumaRelated = recentNightmares.filter((n) => n.traumaRelated).length;
      const traumaPercentage = (traumaRelated / recentNightmares.length) * 100;

      // Estimate recovery trajectory
      const improvementRate = ((firstHalfAvg - secondHalfAvg) / firstHalfAvg) * 100;
      let estimatedRecovery = 'Continue current treatment';
      if (improvementRate > 20) {
        estimatedRecovery = `Excellent progress! At this rate, 4-8 more weeks of consistent tracking`;
      } else if (improvementRate > 10) {
        estimatedRecovery = `Good progress - consider discussing results with therapist`;
      } else if (improvementRate < -10) {
        estimatedRecovery = `Consider adjusting treatment approach - discuss with healthcare provider`;
      }

      return {
        totalNightmares: recentNightmares.length,
        averageSeverity: parseFloat(avgSeverity.toFixed(1)),
        severityTrend: trend,
        mostCommonThemes,
        traumaRelatedPercentage: parseFloat(traumaPercentage.toFixed(1)),
        estimatedRecovery,
      };
    } catch (error) {
      logger.error('[NightmareTracker] Trend analysis error:', error);
      throw error;
    }
  }

  // Private helper methods

  private async extractEmotionalThemes(
    description: string,
    emotionalResponse: string
  ): Promise<string[]> {
    const themes = new Set<string>();

    const emotionKeywords: Record<string, string[]> = {
      fear: ['fear', 'afraid', 'terrified', 'scared', 'panic', 'horror'],
      abandonment: ['alone', 'left', 'abandoned', 'betrayed', 'lost'],
      powerlessness: ['trapped', 'helpless', 'powerless', 'unable', 'stuck'],
      loss: ['death', 'dying', 'losing', 'loss', 'gone', 'dead'],
      chase: ['chased', 'running', 'pursued', 'hunted', 'escape'],
      suffocation: ['choking', 'suffocating', 'drowning', 'can\'t breathe'],
      violence: ['attacked', 'fighting', 'hurt', 'pain', 'injury'],
      uncertainty: ['confused', 'lost', 'disoriented', 'unknown'],
    };

    const searchText = (description + ' ' + emotionalResponse).toLowerCase();

    Object.entries(emotionKeywords).forEach(([emotion, keywords]) => {
      if (keywords.some((kw) => searchText.includes(kw))) {
        themes.add(emotion);
      }
    });

    return Array.from(themes);
  }

  private async calculateSeverityScore(params: {
    description: string;
    emotionalThemes: string[];
    physicalReactions: string[];
    traumaContext?: string;
  }): Promise<number> {
    let score = 3; // Base score

    // Emotional theme severity
    const severeThemes = ['powerlessness', 'suffocation', 'violence'];
    const hasSeveTheme = params.emotionalThemes.some((t) =>
      severeThemes.includes(t)
    );
    if (hasSeveTheme) score += 3;
    else if (params.emotionalThemes.length > 2) score += 2;
    else if (params.emotionalThemes.length > 0) score += 1;

    // Physical reactions
    if (params.physicalReactions.length > 0) {
      score += Math.min(params.physicalReactions.length, 2);
    }

    // Trauma context
    if (params.traumaContext) {
      score += 2;
    }

    // Length indicator (longer descriptions may indicate more detail/distress)
    if (params.description.length > 500) score += 1;

    return Math.min(score, 10);
  }

  private async detectTraumaContent(description: string, context?: string): Promise<boolean> {
    if (context && context.toLowerCase().includes('ptsd')) return true;

    const traumaIndicators = [
      'accident',
      'injury',
      'assault',
      'attack',
      'war',
      'combat',
      'abuse',
      'death',
      'dying',
      'crash',
      'disaster',
    ];

    return traumaIndicators.some((indicator) =>
      description.toLowerCase().includes(indicator)
    );
  }

  private async estimateWakefulness(emotionalResponse: string): Promise<number> {
    const wakeIndicators = [
      'couldn\'t fall back asleep',
      'awake for hours',
      'very hard to sleep',
      'immediately woke up',
      'stayed awake',
    ];

    const hasWakeIndicator = wakeIndicators.some((indicator) =>
      emotionalResponse.toLowerCase().includes(indicator)
    );

    if (hasWakeIndicator) return 5;

    const intensity = emotionalResponse.length;
    if (intensity > 200) return 4;
    if (intensity > 100) return 3;
    if (intensity > 50) return 2;
    return 1;
  }

  private async generateAnalysis(
    entry: NightmareEntry,
    history: NightmareEntry[]
  ): Promise<any> {
    return {
      severity: entry.severityScore,
      severityLevel:
        entry.severityScore <= 3
          ? 'Mild'
          : entry.severityScore <= 6
            ? 'Moderate'
            : 'Severe',
      dominantThemes: entry.emotionalThemes,
      traumaRelated: entry.traumaRelated,
      comparisonToPrevious:
        history.length > 0
          ? entry.severityScore < history[history.length - 1].severityScore
            ? 'Less severe than last nightmare'
            : 'More severe than last nightmare'
          : 'First recorded nightmare',
      physicalImpact: entry.physicalSymptoms.length > 0,
      sleepDisruption: entry.wakefulnessLevel >= 3,
    };
  }

  private async generateRecommendations(
    entry: NightmareEntry,
    analysis: any,
    history: NightmareEntry[]
  ): Promise<string[]> {
    const recommendations: string[] = [];

    if (entry.severityScore >= 8) {
      recommendations.push('Consider contacting a mental health professional soon');
      recommendations.push(
        'Try grounding techniques when you wake: name 5 things you see, 4 you can touch, etc.'
      );
    }

    if (entry.wakefulnessLevel >= 4) {
      recommendations.push(
        'Practice progressive muscle relaxation before bed to ease back to sleep'
      );
    }

    if (entry.traumaRelated) {
      recommendations.push('This nightmare appears trauma-related');
      recommendations.push('Imagery Rehearsal Therapy (IRT) has strong evidence for trauma nightmares');
      recommendations.push('Consider discussing lucid dreaming therapy with your therapist');
    }

    if (entry.emotionalThemes.includes('powerlessness')) {
      recommendations.push('Nightmares involving powerlessness often improve with control-focused therapy');
    }

    if (history.length >= 3) {
      const recentNightmares = history.slice(-3);
      const avgSeverity =
        recentNightmares.reduce((sum, n) => sum + n.severityScore, 0) / recentNightmares.length;

      if (avgSeverity >= 7) {
        recommendations.push('Recurring severe nightmares - professional support recommended');
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('Keep tracking your nightmares - patterns emerge over time');
      recommendations.push('Consider journaling about themes during the day to process emotions');
    }

    return recommendations;
  }

  private async saveNightmareEntry(userId: string, entry: NightmareEntry): Promise<void> {
    try {
      // Save to in-memory history
      if (!this.nightmareHistory.has(userId)) {
        this.nightmareHistory.set(userId, []);
      }
      this.nightmareHistory.get(userId)!.push(entry);

      // Save to persistent memory
      const memoryId = `nightmare-${userId}-${entry.id}`;
      await this.runtime.addMemory({
        id: memoryId,
        content: {
          userId,
          ...entry,
          timestamp: entry.timestamp.toISOString(),
        },
        agentId: this.runtime.agentId,
        createdAt: Date.now(),
      });

      logger.debug(`[NightmareTracker] Saved nightmare ${entry.id} for user ${userId}`);
    } catch (error) {
      logger.error('[NightmareTracker] Error saving nightmare:', error);
    }
  }

  private async loadNightmareHistory(): Promise<void> {
    try {
      // In a full implementation, would load from database
      // For now, we initialize empty history that builds up during runtime
      logger.debug('[NightmareTracker] History loaded (starting fresh)');
    } catch (error) {
      logger.error('[NightmareTracker] Error loading history:', error);
    }
  }

  async stop(): Promise<void> {
    logger.info('[NightmareTracker] Stopped');
  }
}
