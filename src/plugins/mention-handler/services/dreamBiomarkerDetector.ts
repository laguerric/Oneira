import { Service, IAgentRuntime, logger } from '@elizaos/core';

export interface BiomarkerScore {
  condition: 'PTSD' | 'Depression' | 'Anxiety' | 'Sleep_Disorder';
  score: number; // 0-100 (confidence)
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  indicators: string[];
  recommendation: string;
}

export interface DreamBiomarkerAnalysis {
  dreamId: string;
  timestamp: string;
  biomarkers: BiomarkerScore[];
  overallRiskLevel: 'low' | 'moderate' | 'high' | 'critical';
  clinicalSummary: string;
  recommendedActions: string[];
  confidenceLevel: number; // 0-100
}

export class DreamBiomarkerDetectorService extends Service {
  static serviceType = 'dream-biomarker-detector';

  constructor(runtime: IAgentRuntime) {
    super(runtime);
  }

  static async start(runtime: IAgentRuntime): Promise<DreamBiomarkerDetectorService> {
    logger.info('[BiomarkerDetector] Starting dream biomarker detection service');
    const service = new DreamBiomarkerDetectorService(runtime);
    await service.initialize();
    return service;
  }

  async initialize(): Promise<void> {
    logger.info('[BiomarkerDetector] Initialized - screening dreams for mental health indicators');
  }

  /**
   * Analyze dream content for mental health biomarkers
   * Returns confidence scores for PTSD, Depression, Anxiety, Sleep Disorders
   */
  async analyzeDreamBiomarkers(params: {
    userId: string;
    dreamId: string;
    dreamDescription: string;
    nightmareSeverity?: number;
    emotionalThemes?: string[];
    physicalSymptoms?: string[];
  }): Promise<DreamBiomarkerAnalysis> {
    try {
      logger.info(`[BiomarkerDetector] Analyzing biomarkers for dream ${params.dreamId}`);

      const ptsdScore = await this.detectPTSD(params);
      const depressionScore = await this.detectDepression(params);
      const anxietyScore = await this.detectAnxiety(params);
      const sleepDisorderScore = await this.detectSleepDisorder(params);

      const biomarkers: BiomarkerScore[] = [
        ptsdScore,
        depressionScore,
        anxietyScore,
        sleepDisorderScore,
      ].filter((b) => b.score > 20); // Only include if > 20% confidence

      // Determine overall risk level
      const maxScore = Math.max(...biomarkers.map((b) => b.score), 0);
      let overallRiskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      if (maxScore > 75) overallRiskLevel = 'critical';
      else if (maxScore > 60) overallRiskLevel = 'high';
      else if (maxScore > 40) overallRiskLevel = 'moderate';

      const clinicalSummary = this.generateClinicalSummary(biomarkers, overallRiskLevel);
      const recommendedActions = this.generateRecommendations(biomarkers, overallRiskLevel);

      const analysis: DreamBiomarkerAnalysis = {
        dreamId: params.dreamId,
        timestamp: new Date().toISOString(),
        biomarkers,
        overallRiskLevel,
        clinicalSummary,
        recommendedActions,
        confidenceLevel: Math.min(
          100,
          biomarkers.reduce((sum, b) => sum + b.score, 0) / Math.max(biomarkers.length, 1)
        ),
      };

      // Save analysis to memory
      await this.saveBiomarkerAnalysis(params.userId, analysis);

      logger.info(
        `[BiomarkerDetector] Risk level: ${overallRiskLevel}, Biomarkers detected: ${biomarkers.map((b) => b.condition).join(', ')}`
      );

      return analysis;
    } catch (error) {
      logger.error('[BiomarkerDetector] Analysis error:', error);
      throw error;
    }
  }

  /**
   * Get longitudinal biomarker trends (how markers change over time)
   */
  async getBiomarkerTrends(
    userId: string,
    days: number = 30,
    condition?: 'PTSD' | 'Depression' | 'Anxiety' | 'Sleep_Disorder'
  ): Promise<{
    condition: string;
    trend: 'improving' | 'worsening' | 'stable';
    averageScore: number;
    peakScore: number;
    direction: number; // -1 to 1 (negative = improving, positive = worsening)
    clinicalSignificance: string;
  }[]> {
    try {
      const analyses = await this.loadBiomarkerHistory(userId, days);

      if (analyses.length === 0) {
        return [];
      }

      const conditions = condition
        ? [condition]
        : ['PTSD', 'Depression', 'Anxiety', 'Sleep_Disorder'];

      const trends = conditions.map((cond) => {
        const scores = analyses
          .flatMap((a) => a.biomarkers)
          .filter((b) => b.condition === cond)
          .map((b) => b.score);

        if (scores.length === 0) {
          return null;
        }

        const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
        const secondHalf = scores.slice(Math.floor(scores.length / 2));

        const firstAvg =
          firstHalf.reduce((a, b) => a + b, 0) / Math.max(firstHalf.length, 1);
        const secondAvg =
          secondHalf.reduce((a, b) => a + b, 0) / Math.max(secondHalf.length, 1);

        const direction = (secondAvg - firstAvg) / Math.max(firstAvg, 1);
        let trend: 'improving' | 'worsening' | 'stable' = 'stable';

        if (direction < -0.15) trend = 'improving';
        else if (direction > 0.15) trend = 'worsening';

        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        const peakScore = Math.max(...scores);

        let significance = 'Stable - continue monitoring';
        if (trend === 'improving') {
          significance = `Improving ${Math.abs(Math.round(direction * 100))}% - positive progress`;
        } else if (trend === 'worsening') {
          significance = `Worsening ${Math.round(direction * 100)}% - consider professional support`;
        }

        return {
          condition: cond,
          trend,
          averageScore: Math.round(avgScore),
          peakScore,
          direction: parseFloat(direction.toFixed(2)),
          clinicalSignificance: significance,
        };
      });

      return trends.filter((t) => t !== null) as typeof trends;
    } catch (error) {
      logger.error('[BiomarkerDetector] Trend analysis error:', error);
      return [];
    }
  }

  // Private biomarker detection methods

  private async detectPTSD(params: {
    dreamDescription: string;
    nightmareSeverity?: number;
    emotionalThemes?: string[];
    physicalSymptoms?: string[];
  }): Promise<BiomarkerScore> {
    const text = params.dreamDescription.toLowerCase();
    let score = 0;
    const indicators: string[] = [];

    // Trauma-related content
    const traumaKeywords = [
      'attack',
      'violence',
      'war',
      'combat',
      'injury',
      'death',
      'dying',
      'chase',
      'trapped',
      'helpless',
    ];
    const traumaMatches = traumaKeywords.filter((kw) => text.includes(kw)).length;
    if (traumaMatches > 0) {
      score += Math.min(traumaMatches * 15, 35);
      indicators.push(`${traumaMatches} trauma-related themes detected`);
    }

    // Nightmare severity
    if (params.nightmareSeverity && params.nightmareSeverity >= 7) {
      score += 20;
      indicators.push('High nightmare severity');
    }

    // Emotional themes associated with PTSD
    const ptsdEmotions = ['fear', 'powerlessness', 'abandonment'];
    const ptsdThemeMatch = params.emotionalThemes?.filter((t) =>
      ptsdEmotions.includes(t)
    ).length || 0;
    if (ptsdThemeMatch > 0) {
      score += ptsdThemeMatch * 15;
      indicators.push(`PTSD-related emotions: ${ptsdThemeMatch} detected`);
    }

    // Physical symptoms during nightmare
    const ptsdPhysical = ['racing heart', 'sweating', 'muscle tension', 'waking up'];
    const physicalMatch =
      params.physicalSymptoms?.filter((s) => ptsdPhysical.includes(s)).length || 0;
    if (physicalMatch > 0) {
      score += physicalMatch * 10;
      indicators.push(`Physical arousal symptoms: ${physicalMatch}`);
    }

    // Recurrent themes (hypervigilance pattern)
    if (text.includes('again') || text.includes('keep') || text.includes('always')) {
      score += 10;
      indicators.push('Recurrent/repetitive nightmare pattern');
    }

    return {
      condition: 'PTSD',
      score: Math.min(score, 100),
      riskLevel:
        score > 75 ? 'critical' : score > 60 ? 'high' : score > 40 ? 'moderate' : 'low',
      indicators,
      recommendation:
        score > 60
          ? 'Strong PTSD indicators. Recommend: Trauma-focused therapy (CBT-P, EMDR), Imagery Rehearsal Therapy (IRT), or lucid dreaming therapy. Consider professional evaluation.'
          : 'Some PTSD indicators present. Monitor dream patterns over time.',
    };
  }

  private async detectDepression(params: {
    dreamDescription: string;
    emotionalThemes?: string[];
  }): Promise<BiomarkerScore> {
    const text = params.dreamDescription.toLowerCase();
    let score = 0;
    const indicators: string[] = [];

    // Hopelessness and loss themes
    const depressionKeywords = [
      'dead',
      'death',
      'dying',
      'hopeless',
      'pointless',
      'empty',
      'lost',
      'alone',
      'abandoned',
      'failure',
      'worthless',
    ];
    const depressionMatches = depressionKeywords.filter((kw) => text.includes(kw))
      .length;
    if (depressionMatches > 0) {
      score += Math.min(depressionMatches * 12, 40);
      indicators.push(`${depressionMatches} depressive themes detected`);
    }

    // Dark/bleak imagery
    if (
      text.includes('dark') ||
      text.includes('grey') ||
      text.includes('grey') ||
      text.includes('gray')
    ) {
      score += 15;
      indicators.push('Dark/bleak imagery');
    }

    // Sadness/withdrawal emotions
    if (params.emotionalThemes?.includes('sadness')) {
      score += 20;
      indicators.push('Sadness/grief themes');
    }

    // Isolation/loneliness
    if (text.includes('alone') || text.includes('isolated') || text.includes('lonely')) {
      score += 15;
      indicators.push('Isolation/loneliness themes');
    }

    // Inactivity/passivity
    if (
      text.includes('numb') ||
      text.includes('couldn\'t move') ||
      text.includes('frozen')
    ) {
      score += 10;
      indicators.push('Passivity/numbness');
    }

    return {
      condition: 'Depression',
      score: Math.min(score, 100),
      riskLevel:
        score > 75 ? 'critical' : score > 60 ? 'high' : score > 40 ? 'moderate' : 'low',
      indicators,
      recommendation:
        score > 60
          ? 'Depression indicators detected. Recommend: Professional mental health evaluation, CBT or psychotherapy, consider medication evaluation.'
          : 'Some depressive themes. Continue monitoring mood and sleep patterns.',
    };
  }

  private async detectAnxiety(params: {
    dreamDescription: string;
    emotionalThemes?: string[];
    physicalSymptoms?: string[];
  }): Promise<BiomarkerScore> {
    const text = params.dreamDescription.toLowerCase();
    let score = 0;
    const indicators: string[] = [];

    // Threat/uncertainty perception
    const anxietyKeywords = [
      'worried',
      'anxious',
      'nervous',
      'uncertain',
      'confused',
      'lost',
      'danger',
      'threat',
      'unpredictable',
    ];
    const anxietyMatches = anxietyKeywords.filter((kw) => text.includes(kw)).length;
    if (anxietyMatches > 0) {
      score += Math.min(anxietyMatches * 12, 35);
      indicators.push(`${anxietyMatches} anxiety-related themes`);
    }

    // Loss of control
    if (
      text.includes('couldn\'t control') ||
      text.includes('no control') ||
      text.includes('helpless')
    ) {
      score += 20;
      indicators.push('Loss of control theme');
    }

    // Physical anxiety symptoms
    const anxietyPhysical = ['racing heart', 'shortness of breath', 'sweating'];
    const physicalMatch =
      params.physicalSymptoms?.filter((s) => anxietyPhysical.includes(s)).length || 0;
    if (physicalMatch > 0) {
      score += physicalMatch * 15;
      indicators.push(`Anxiety physical symptoms: ${physicalMatch}`);
    }

    // Uncertainty/indecision
    if (
      text.includes('don\'t know') ||
      text.includes('unclear') ||
      text.includes('confused')
    ) {
      score += 10;
      indicators.push('Uncertainty/confusion theme');
    }

    return {
      condition: 'Anxiety',
      score: Math.min(score, 100),
      riskLevel:
        score > 75 ? 'critical' : score > 60 ? 'high' : score > 40 ? 'moderate' : 'low',
      indicators,
      recommendation:
        score > 60
          ? 'Anxiety indicators detected. Recommend: CBT for anxiety, relaxation techniques, sleep hygiene optimization. Consider professional evaluation.'
          : 'Mild anxiety present. Practice relaxation before bedtime.',
    };
  }

  private async detectSleepDisorder(params: {
    dreamDescription: string;
    nightmareSeverity?: number;
  }): Promise<BiomarkerScore> {
    const text = params.dreamDescription.toLowerCase();
    let score = 0;
    const indicators: string[] = [];

    // Fragmented/bizarre dreams
    if (text.includes('weird') || text.includes('strange') || text.includes('bizarre')) {
      score += 15;
      indicators.push('Bizarre/fragmented dream content');
    }

    // Sleep disruption
    if (
      text.includes('woke up') ||
      text.includes('woken up') ||
      text.includes('couldn\'t fall back asleep')
    ) {
      score += 20;
      indicators.push('Sleep fragmentation');
    }

    // Vivid/intense dreams (can indicate REM abnormalities)
    if (params.nightmareSeverity && params.nightmareSeverity >= 8) {
      score += 15;
      indicators.push('Unusually vivid/intense dreams');
    }

    // Multiple themes (polythematic - sign of REM disorder)
    const themeKeywords = [
      'then',
      'suddenly',
      'then',
      'switched',
      'changed',
      'different',
    ];
    const themeShifts = themeKeywords.filter((kw) => text.includes(kw)).length;
    if (themeShifts > 2) {
      score += 15;
      indicators.push('Multiple rapid dream themes (possible REM abnormality)');
    }

    // Nightmares several times per week (severity indicator)
    if (text.includes('every night') || text.includes('all the time')) {
      score += 20;
      indicators.push('High nightmare frequency');
    }

    return {
      condition: 'Sleep_Disorder',
      score: Math.min(score, 100),
      riskLevel:
        score > 75 ? 'critical' : score > 60 ? 'high' : score > 40 ? 'moderate' : 'low',
      indicators,
      recommendation:
        score > 60
          ? 'Sleep disorder indicators detected. Recommend: Sleep specialist evaluation, polysomnography testing, sleep hygiene optimization.'
          : 'Monitor sleep quality and dream patterns.',
    };
  }

  private generateClinicalSummary(
    biomarkers: BiomarkerScore[],
    riskLevel: 'low' | 'moderate' | 'high' | 'critical'
  ): string {
    if (biomarkers.length === 0) {
      return 'Dream content shows no significant mental health biomarkers detected.';
    }

    const conditions = biomarkers.map((b) => b.condition).join(', ');
    const summary = `Detected possible indicators of: ${conditions}. Risk level: ${riskLevel.toUpperCase()}.`;

    if (riskLevel === 'critical') {
      return (
        summary +
        ' Strong clinical indicators present. Professional mental health evaluation strongly recommended.'
      );
    } else if (riskLevel === 'high') {
      return summary + ' Significant indicators present. Professional evaluation recommended.';
    } else if (riskLevel === 'moderate') {
      return summary + ' Monitor and track patterns over time.';
    }

    return summary;
  }

  private generateRecommendations(
    biomarkers: BiomarkerScore[],
    riskLevel: 'low' | 'moderate' | 'high' | 'critical'
  ): string[] {
    const recommendations: string[] = [];

    if (riskLevel === 'critical') {
      recommendations.push('🚨 Seek professional mental health evaluation immediately');
      recommendations.push('Contact: therapist, psychiatrist, or crisis hotline');
    }

    biomarkers.forEach((b) => {
      // Extract first part of recommendation (before the period)
      const firstSentence = b.recommendation.split('.')[0];
      if (!recommendations.includes(firstSentence)) {
        recommendations.push(firstSentence);
      }
    });

    if (riskLevel !== 'low') {
      recommendations.push('Continue tracking dreams to monitor patterns and treatment progress');
    }

    return recommendations;
  }

  private async saveBiomarkerAnalysis(
    userId: string,
    analysis: DreamBiomarkerAnalysis
  ): Promise<void> {
    try {
      const memoryId = `biomarker-${userId}-${analysis.dreamId}`;
      await this.runtime.addMemory({
        id: memoryId,
        content: analysis,
        agentId: this.runtime.agentId,
        createdAt: Date.now(),
      });
    } catch (error) {
      logger.error('[BiomarkerDetector] Error saving analysis:', error);
    }
  }

  private async loadBiomarkerHistory(
    userId: string,
    days: number
  ): Promise<DreamBiomarkerAnalysis[]> {
    // In production, would load from database
    // For now, return empty array (can be populated with memory queries)
    return [];
  }

  async stop(): Promise<void> {
    logger.info('[BiomarkerDetector] Stopped');
  }
}
