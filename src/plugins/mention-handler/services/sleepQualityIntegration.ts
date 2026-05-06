import { Service, IAgentRuntime, logger } from '@elizaos/core';

export interface SleepMetrics {
  date: string;
  totalSleep: number; // minutes
  remSleep: number; // minutes
  deepSleep: number; // minutes
  lightSleep: number; // minutes
  heartRateAverage: number;
  heartRateVariability: number; // HRV (lower = stress, higher = recovery)
  sleepQualityScore: number; // 0-100
  remFragmentation: boolean; // REM was interrupted
  source: 'oura' | 'apple_health' | 'whoop' | 'manual';
}

export interface DreamSleepCorrelation {
  nightmareId: string;
  sleepMetricsDate: string;
  remSleepDuration: number;
  remFragmented: boolean;
  heartRateVariability: number;
  insights: string[];
  correlationStrength: number; // 0-1, how strongly linked
}

export class SleepQualityIntegrationService extends Service {
  static serviceType = 'sleep-quality-integration';
  private sleepMetricsCache: Map<string, SleepMetrics[]> = new Map();

  constructor(runtime: IAgentRuntime) {
    super(runtime);
  }

  static async start(runtime: IAgentRuntime): Promise<SleepQualityIntegrationService> {
    logger.info('[SleepQuality] Starting sleep quality integration service');
    const service = new SleepQualityIntegrationService(runtime);
    await service.initialize();
    return service;
  }

  async initialize(): Promise<void> {
    try {
      logger.info('[SleepQuality] Initialized - waiting for wearable connections');
      // In production, would establish OAuth connections with Oura, Apple Health, Whoop
    } catch (error) {
      logger.error('[SleepQuality] Init error:', error);
    }
  }

  /**
   * Record sleep metrics from wearable device
   */
  async recordSleepMetrics(userId: string, metrics: Omit<SleepMetrics, 'date'>): Promise<SleepMetrics> {
    try {
      const sleepMetrics: SleepMetrics = {
        date: new Date().toISOString().split('T')[0],
        ...metrics,
      };

      // Save to cache
      if (!this.sleepMetricsCache.has(userId)) {
        this.sleepMetricsCache.set(userId, []);
      }
      this.sleepMetricsCache.get(userId)!.push(sleepMetrics);

      // Save to persistent memory
      const memoryId = `sleep-metrics-${userId}-${sleepMetrics.date}`;
      await this.runtime.addMemory({
        id: memoryId,
        content: sleepMetrics,
        agentId: this.runtime.agentId,
        createdAt: Date.now(),
      });

      logger.info(
        `[SleepQuality] Recorded sleep: ${metrics.totalSleep}min total, ${metrics.remSleep}min REM`
      );

      return sleepMetrics;
    } catch (error) {
      logger.error('[SleepQuality] Error recording metrics:', error);
      throw error;
    }
  }

  /**
   * Correlate nightmare data with sleep metrics
   * Shows how sleep quality affects nightmare severity
   */
  async correlateNightmareWithSleep(params: {
    userId: string;
    nightmareId: string;
    nightmareSeverity: number;
    nightmareDate: string;
  }): Promise<DreamSleepCorrelation> {
    try {
      logger.info(`[SleepQuality] Correlating nightmare with sleep metrics for ${params.userId}`);

      const userSleepMetrics = this.sleepMetricsCache.get(params.userId) || [];

      // Get sleep metrics from night of nightmare (or previous night)
      const nightmareDate = new Date(params.nightmareDate);
      const previousNightDate = new Date(nightmareDate);
      previousNightDate.setDate(previousNightDate.getDate() - 1);

      const relevantMetrics = userSleepMetrics.find(
        (m) =>
          m.date === params.nightmareDate || m.date === previousNightDate.toISOString().split('T')[0]
      );

      if (!relevantMetrics) {
        logger.warn(`[SleepQuality] No sleep data found for nightmare date ${params.nightmareDate}`);
        return {
          nightmareId: params.nightmareId,
          sleepMetricsDate: 'no-data',
          remSleepDuration: 0,
          remFragmented: false,
          heartRateVariability: 0,
          insights: ['Connect a wearable device (Oura, Apple Watch, Whoop) to see correlations'],
          correlationStrength: 0,
        };
      }

      // Analyze correlations
      const insights = await this.analyzeCorrelations(params.nightmareSeverity, relevantMetrics);
      const correlationStrength = this.calculateCorrelationStrength(
        params.nightmareSeverity,
        relevantMetrics
      );

      const correlation: DreamSleepCorrelation = {
        nightmareId: params.nightmareId,
        sleepMetricsDate: relevantMetrics.date,
        remSleepDuration: relevantMetrics.remSleep,
        remFragmented: relevantMetrics.remFragmentation,
        heartRateVariability: relevantMetrics.heartRateVariability,
        insights,
        correlationStrength,
      };

      // Save correlation to memory
      const memoryId = `correlation-${params.nightmareId}`;
      await this.runtime.addMemory({
        id: memoryId,
        content: correlation,
        agentId: this.runtime.agentId,
        createdAt: Date.now(),
      });

      return correlation;
    } catch (error) {
      logger.error('[SleepQuality] Correlation error:', error);
      throw error;
    }
  }

  /**
   * Get personalized sleep optimization recommendations based on nightmare patterns
   */
  async getSleepOptimizationPlan(
    userId: string,
    nightmareHistory: any[]
  ): Promise<{
    optimalSleepWindow: string;
    targetREmSleep: number;
    hrvTarget: number;
    recommendations: string[];
    expectedImprovement: string;
  }> {
    try {
      const userSleepMetrics = this.sleepMetricsCache.get(userId) || [];

      if (userSleepMetrics.length < 3) {
        return {
          optimalSleepWindow: 'Collect more sleep data to optimize',
          targetREmSleep: 90,
          hrvTarget: 30,
          recommendations: [
            'Connect a wearable device to start tracking sleep',
            'Record sleep for at least 1-2 weeks to identify patterns',
          ],
          expectedImprovement:
            'Once we have baseline data, we can identify optimal sleep timing for you',
        };
      }

      // Analyze which sleep conditions correlate with worse nightmares
      const nightmareCorrelations = await Promise.all(
        nightmareHistory.slice(-10).map((nm) =>
          this.correlateNightmareWithSleep({
            userId,
            nightmareId: nm.id,
            nightmareSeverity: nm.severityScore,
            nightmareDate: nm.timestamp,
          })
        )
      );

      // Find worst sleep conditions during nightmares
      const worstNightmares = nightmareCorrelations
        .filter((c) => c.sleepMetricsDate !== 'no-data')
        .sort((a, b) => b.correlationStrength - a.correlationStrength)
        .slice(0, 3);

      const avgREmDuringBadNights =
        worstNightmares.reduce((sum, c) => sum + c.remSleepDuration, 0) / Math.max(worstNightmares.length, 1);
      const avgHrvDuringBadNights =
        worstNightmares.reduce((sum, c) => sum + c.heartRateVariability, 0) /
        Math.max(worstNightmares.length, 1);

      // Calculate optimal metrics (opposite of worst)
      const optimalRem = Math.min(avgREmDuringBadNights + 30, 120);
      const optimalHrv = Math.max(avgHrvDuringBadNights + 10, 40);

      // Determine optimal sleep window
      const bestNight = userSleepMetrics.filter((m) => m.sleepQualityScore >= 80).pop();
      const optimalSleepWindow = bestNight
        ? `Bedtime around 10-11pm (based on your best sleep night: ${bestNight.date})`
        : 'Maintain consistent 10-11pm bedtime';

      const recommendations: string[] = [];

      if (
        worstNightmares.some((c) => c.remFragmented)
      ) {
        recommendations.push(
          'REM fragmentation detected during nightmares - avoid caffeine after 2pm'
        );
        recommendations.push(
          'Consider a brief nap (20-30 min) in early afternoon to consolidate REM'
        );
      }

      if (avgHrvDuringBadNights < 25) {
        recommendations.push(
          'Low HRV during nightmares suggests stress - try evening relaxation: yoga, meditation, or journaling'
        );
      }

      if (avgREmDuringBadNights < 60) {
        recommendations.push(
          'Low REM sleep correlates with your nightmares - aim for 90+ minutes'
        );
        recommendations.push('Try: consistent bedtime, avoid alcohol 4+ hours before bed');
      }

      const hrvImprovement = Math.round(optimalHrv - avgHrvDuringBadNights);
      const remImprovement = Math.round(optimalRem - avgREmDuringBadNights);

      let expectedImprovement = 'Implementing these changes may reduce nightmare severity by 20-30%';
      if (hrvImprovement > 15 || remImprovement > 30) {
        expectedImprovement =
          'Significant sleep optimization opportunity detected - these changes could reduce nightmares by 40-50%';
      }

      return {
        optimalSleepWindow,
        targetREmSleep: Math.round(optimalRem),
        hrvTarget: Math.round(optimalHrv),
        recommendations: recommendations.length > 0 ? recommendations : ['Your sleep looks healthy - maintain current patterns'],
        expectedImprovement,
      };
    } catch (error) {
      logger.error('[SleepQuality] Error generating optimization plan:', error);
      throw error;
    }
  }

  /**
   * Get sleep-dream insights report
   */
  async generateSleepDreamReport(userId: string, days: number = 30): Promise<{
    bestSleepNight: SleepMetrics | null;
    worstSleepNight: SleepMetrics | null;
    averageRem: number;
    averageHrv: number;
    remFragmentationRate: number;
    keyInsights: string[];
  }> {
    try {
      const userSleepMetrics = this.sleepMetricsCache.get(userId) || [];
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const recentMetrics = userSleepMetrics.filter(
        (m) => new Date(m.date) > cutoffDate
      );

      if (recentMetrics.length === 0) {
        return {
          bestSleepNight: null,
          worstSleepNight: null,
          averageRem: 0,
          averageHrv: 0,
          remFragmentationRate: 0,
          keyInsights: ['No sleep data available - connect a wearable device to start tracking'],
        };
      }

      const bestNight = recentMetrics.reduce((best, m) =>
        m.sleepQualityScore > best.sleepQualityScore ? m : best
      );

      const worstNight = recentMetrics.reduce((worst, m) =>
        m.sleepQualityScore < worst.sleepQualityScore ? m : worst
      );

      const avgRem =
        recentMetrics.reduce((sum, m) => sum + m.remSleep, 0) / recentMetrics.length;
      const avgHrv =
        recentMetrics.reduce((sum, m) => sum + m.heartRateVariability, 0) / recentMetrics.length;

      const fragmentedNights = recentMetrics.filter((m) => m.remFragmentation).length;
      const fragmentationRate = (fragmentedNights / recentMetrics.length) * 100;

      const insights: string[] = [];

      if (avgRem >= 90) {
        insights.push(
          '✓ Excellent REM sleep amount - good foundation for emotional processing and dream recall'
        );
      } else if (avgRem < 60) {
        insights.push(
          '⚠️ Low REM sleep - this can intensify nightmares; prioritize consistent sleep schedule'
        );
      }

      if (avgHrv >= 35) {
        insights.push(
          '✓ Strong HRV - indicates good recovery and stress resilience between sleep cycles'
        );
      } else if (avgHrv < 20) {
        insights.push(
          '⚠️ Low HRV - suggests elevated stress during sleep; consider relaxation practices'
        );
      }

      if (fragmentationRate > 30) {
        insights.push(
          '⚠️ Frequent REM fragmentation detected - can disrupt dream continuity and increase awakefulness'
        );
      } else if (fragmentationRate === 0) {
        insights.push('✓ Smooth REM cycles - optimal conditions for dream continuity and processing');
      }

      if (bestNight.sleepQualityScore - worstNight.sleepQualityScore > 30) {
        insights.push(
          `Your best night (${bestNight.date}): ${bestNight.sleepQualityScore}/100 - Identify factors from that night and replicate them`
        );
      }

      return {
        bestSleepNight: bestNight,
        worstSleepNight: worstNight,
        averageRem: Math.round(avgRem),
        averageHrv: Math.round(avgHrv),
        remFragmentationRate: Math.round(fragmentationRate),
        keyInsights: insights,
      };
    } catch (error) {
      logger.error('[SleepQuality] Report generation error:', error);
      throw error;
    }
  }

  // Private helper methods

  private async analyzeCorrelations(
    nightmareSeverity: number,
    metrics: SleepMetrics
  ): Promise<string[]> {
    const insights: string[] = [];

    // REM sleep correlation
    if (metrics.remSleep < 60 && nightmareSeverity >= 7) {
      insights.push(
        'Low REM sleep may have intensified this nightmare - aim for 90+ minutes REM'
      );
    } else if (metrics.remSleep >= 100 && nightmareSeverity <= 3) {
      insights.push('High quality REM sleep correlates with milder dreams');
    }

    // REM fragmentation
    if (metrics.remFragmentation && nightmareSeverity >= 6) {
      insights.push(
        'REM fragmentation detected - interrupted REM cycles can cause more intense dreams'
      );
    }

    // HRV correlation (lower HRV = more stress during sleep)
    if (metrics.heartRateVariability < 20 && nightmareSeverity >= 7) {
      insights.push(
        'Low heart rate variability suggests elevated stress during sleep - may amplify nightmares'
      );
    } else if (metrics.heartRateVariability > 40) {
      insights.push('Strong HRV indicates good nervous system recovery during sleep');
    }

    // Total sleep
    if (metrics.totalSleep < 360 && nightmareSeverity >= 6) {
      insights.push('Short sleep duration may increase nightmare intensity - prioritize 7-8 hours');
    }

    if (insights.length === 0) {
      insights.push('Sleep quality was reasonable - other factors may be affecting nightmares');
    }

    return insights;
  }

  private calculateCorrelationStrength(
    nightmareSeverity: number,
    metrics: SleepMetrics
  ): number {
    let correlation = 0;

    // REM sleep (0.3 weight)
    const remDeviation = Math.abs(metrics.remSleep - 90) / 90;
    correlation += (1 - remDeviation) * 0.3;

    // HRV (0.3 weight) - lower HRV = more stress
    const hrvDeviation = Math.abs(metrics.heartRateVariability - 35) / 35;
    correlation += (1 - hrvDeviation) * 0.3;

    // Fragmentation (0.2 weight)
    correlation += metrics.remFragmentation ? 0.0 : 0.2;

    // Total sleep (0.2 weight)
    const totalSleepDeviation = Math.abs(metrics.totalSleep - 480) / 480;
    correlation += (1 - totalSleepDeviation) * 0.2;

    return Math.max(0, Math.min(1, correlation));
  }

  async stop(): Promise<void> {
    logger.info('[SleepQuality] Stopped');
  }
}
