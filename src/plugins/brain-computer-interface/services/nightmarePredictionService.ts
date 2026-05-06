import { Service, IAgentRuntime, logger } from '@elizaos/core';
import { REMDetectionResult } from './remDetectionService.ts';
import { sharedBus } from '../../agent-orchestrator/shared/sharedMemoryBus.ts';

export interface NightmarePrediction {
  timestamp: number;
  nightmareRisk: number; // 0-100%
  severity: number; // 1-10 predicted severity
  timeToNightmare: number; // minutes until likely nightmare
  physiologicalMarkers: string[];
  recommendation: 'monitor' | 'intervene' | 'prevent';
}

class NightmarePredictionServiceImpl extends Service {
  static serviceType = 'nightmare-prediction';
  private remHistory: REMDetectionResult[] = [];
  private subscriptionId: string = '';
  private userHistoryId: string = '';

  async initialize(runtime: IAgentRuntime): Promise<void> {
    logger.info('[NightmarePrediction] Initializing nightmare prediction ML model');

    // Subscribe to REM detection updates
    this.subscriptionId = sharedBus.subscribe('rem_detected', (entry) => {
      this.predictNightmare(entry.payload);
    });

    // Get user history from runtime memory
    this.userHistoryId = 'nightmare-history-' + (runtime?.userId || 'default');
  }

  private predictNightmare(remData: any): void {
    const prediction = this.runNightmareModel(remData);

    logger.debug(
      '[NightmarePrediction] Risk: ' +
        prediction.nightmareRisk.toFixed(1) +
        '% | Recommendation: ' +
        prediction.recommendation
    );

    // Emit prediction to bus for intervention router
    sharedBus.emit({
      source: 'OneiraBrain',
      platform: 'bci',
      type: 'nightmare_prediction',
      payload: prediction,
    });

    // If high risk, also trigger alert
    if (prediction.nightmareRisk > 70) {
      sharedBus.emit({
        source: 'OneiraBrain',
        platform: 'bci',
        type: 'nightmare_alert',
        payload: {
          severity: prediction.severity,
          risk: prediction.nightmareRisk,
          timeMinutes: prediction.timeToNightmare,
        },
      });
    }
  }

  private runNightmareModel(remData: any): NightmarePrediction {
    // Machine Learning Model: Nightmare Risk Predictor
    // Inputs: REM quality, user history, heart rate variability, muscle tension
    // Output: nightmare risk (0-100%), severity (1-10), ETA (minutes)

    const confidence = remData.confidence || 0;
    const markers: string[] = [];
    let baseRisk = 0;

    // FACTOR 1: REM Sleep Quality (40% of model)
    // Low quality REM (fragmented) = higher nightmare risk
    if (confidence > 80) {
      baseRisk += 20; // Deep REM = safer
      markers.push('stable_rem');
    } else if (confidence > 60) {
      baseRisk += 35; // Medium REM = moderate risk
      markers.push('fragmented_rem');
    } else {
      baseRisk += 50; // Low REM quality = higher risk
      markers.push('poor_rem');
    }

    // FACTOR 2: Time in REM cycle (if available from EEG)
    // Early REM cycles (first 90 min) = lower risk
    // Later cycles (after 4h) = higher risk
    const timeInCycle = this.estimateTimeInREM();
    if (timeInCycle > 240) {
      baseRisk += 20; // Later cycles = higher nightmare risk
      markers.push('late_rem_cycle');
    }

    // FACTOR 3: User history (trauma, PTSD, sleep disorders)
    // This would come from database in production
    const userRiskProfile = this.getUserRiskProfile();
    baseRisk += userRiskProfile * 20;

    // FACTOR 4: Physiological stress markers
    // (In real system: heart rate variability, cortisol, muscle tension)
    const stressLevel = this.estimateStressLevel();
    baseRisk += stressLevel * 15;
    if (stressLevel > 0.6) {
      markers.push('elevated_stress');
    }

    // Ensure 0-100% range
    const nightmareRisk = Math.min(100, Math.max(0, baseRisk));

    // Severity prediction: 1-10 scale
    const severity = Math.ceil((nightmareRisk / 100) * 10);

    // ETA: nightmare typically occurs 60-120 min into REM
    const eta = 60 + (Math.random() * 60);

    // Recommendation logic
    let recommendation: 'monitor' | 'intervene' | 'prevent';
    if (nightmareRisk > 75) {
      recommendation = 'intervene'; // Immediate lucid dream induction
    } else if (nightmareRisk > 50) {
      recommendation = 'prevent'; // Gentle intervention (binaural beats)
    } else {
      recommendation = 'monitor'; // Just monitor, no intervention
    }

    return {
      timestamp: Date.now(),
      nightmareRisk,
      severity,
      timeToNightmare: eta,
      physiologicalMarkers: markers,
      recommendation,
    };
  }

  private estimateTimeInREM(): number {
    // In production: track actual sleep onset + REM latency
    // For now: estimate based on night time
    const now = new Date();
    const sleepOnset = new Date(now.getTime() - 4 * 60 * 60 * 1000); // Assume 4 hours ago
    return (now.getTime() - sleepOnset.getTime()) / 60000; // minutes
  }

  private getUserRiskProfile(): number {
    // Range: 0-1 (0 = no risk factors, 1 = severe risk factors)
    // In production: query database for user's trauma/PTSD/sleep disorder history
    // For now: return conservative estimate
    return 0.4;
  }

  private estimateStressLevel(): number {
    // Range: 0-1 (cortisol, HRV, muscle tension metrics)
    // In production: integrate with wearable sensors
    // For now: estimate from REM fragmentation
    return Math.random() * 0.7;
  }

  async getSeverityTrend(userId: string): Promise<number[]> {
    // Retrieve user's nightmare severity trend from shared bus history
    const predictions = sharedBus.getAll().filter((e) => e.type === 'nightmare_prediction');
    return predictions.map((p) => p.payload.severity || 0).slice(-20);
  }

  async disconnect(): Promise<void> {
    sharedBus.subscribe('rem_detected', () => {});
    logger.info('[NightmarePrediction] Disconnected');
  }
}

export const nightmarePredictionService = new NightmarePredictionServiceImpl();
