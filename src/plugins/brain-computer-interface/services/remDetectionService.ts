import { Service, IAgentRuntime, logger } from '@elizaos/core';
import { EEGProcessed } from './eegStreamService.ts';
import { sharedBus } from '../../agent-orchestrator/shared/sharedMemoryBus.ts';

export interface REMDetectionResult {
  timestamp: number;
  isREMSleep: boolean;
  remConfidence: number; // 0-100%
  sawthoothScore: number;
  thetaAlphaRatio: number;
  recommendation: 'rem_detected' | 'light_sleep' | 'deep_sleep' | 'awake';
}

class REMDetectionServiceImpl extends Service {
  static serviceType = 'rem-detection';
  private eegBuffer: EEGProcessed[] = [];
  private remHistory: REMDetectionResult[] = [];
  private subscriptionId: string = '';

  async initialize(runtime: IAgentRuntime): Promise<void> {
    logger.info('[REMDetection] Initializing REM detection');

    // Subscribe to EEG stream updates
    this.subscriptionId = sharedBus.subscribe('eeg_processed', (entry) => {
      if (entry.payload.eeg) {
        this.analyzeEEGForREM(entry.payload.eeg);
      }
    });
  }

  private analyzeEEGForREM(eegData: EEGProcessed): void {
    this.eegBuffer.push(eegData);

    // Keep only last 30 seconds (256 Hz * 30s = 7680 samples, but here we have 1-sec summaries)
    if (this.eegBuffer.length > 30) {
      this.eegBuffer.shift();
    }

    if (this.eegBuffer.length < 5) return; // Need minimum window

    const result = this.detectREM(eegData);
    this.remHistory.push(result);

    if (this.remHistory.length > 100) {
      this.remHistory.shift();
    }

    logger.debug('[REMDetection] REM Confidence: ' + result.remConfidence.toFixed(1) + '%');

    if (result.isREMSleep) {
      sharedBus.emit({
        source: 'OneiraBrain',
        platform: 'bci',
        type: 'rem_detected',
        payload: {
          confidence: result.remConfidence,
          timeWindowSeconds: this.eegBuffer.length,
        },
      });
    }
  }

  private detectREM(current: EEGProcessed): REMDetectionResult {
    const thetaAlphaRatio = current.thetaWaves / (current.alphaWaves + 0.001);

    // REM Sleep Indicators:
    // 1. Sawtooth waves (2-6 Hz, characteristic of REM)
    // 2. Theta dominance (4-8 Hz)
    // 3. Alpha waves suppressed (compared to wake)
    // 4. Low delta (not in deep sleep)

    let confidence = 0;

    // Sawtooth presence = strong REM indicator (40% weight)
    confidence += current.sawtooth * 40;

    // Theta/Alpha ratio > 1 suggests REM (30% weight)
    if (thetaAlphaRatio > 1) {
      confidence += Math.min(30, thetaAlphaRatio * 15);
    }

    // Low delta = not in deep sleep (15% weight)
    if (current.deltaWaves < 1) {
      confidence += 15;
    }

    // Beta/Gamma low = not fully awake (15% weight)
    if (current.betaWaves + current.gammaWaves < 1) {
      confidence += 15;
    }

    const isREMSleep = confidence > 60;

    // Determine stage
    let recommendation: 'rem_detected' | 'light_sleep' | 'deep_sleep' | 'awake';
    if (confidence > 70) {
      recommendation = 'rem_detected';
    } else if (current.deltaWaves > 2) {
      recommendation = 'deep_sleep';
    } else if (current.betaWaves + current.gammaWaves > 2) {
      recommendation = 'awake';
    } else {
      recommendation = 'light_sleep';
    }

    return {
      timestamp: current.timestamp,
      isREMSleep,
      remConfidence: Math.min(100, confidence),
      sawthoothScore: current.sawtooth,
      thetaAlphaRatio,
      recommendation,
    };
  }

  getLatestREM(): REMDetectionResult | null {
    return this.remHistory.length > 0 ? this.remHistory[this.remHistory.length - 1] : null;
  }

  getREMTrend(lastNMinutes: number = 5): number[] {
    // Return last N minutes of REM confidence scores
    const recent = this.remHistory.slice(-lastNMinutes);
    return recent.map((r) => r.remConfidence);
  }

  async disconnect(): Promise<void> {
    sharedBus.subscribe('eeg_processed', () => {});
    logger.info('[REMDetection] Disconnected');
  }
}

export const remDetectionService = new REMDetectionServiceImpl();
