import { Service, IAgentRuntime, logger } from '@elizaos/core';
import { NightmarePrediction } from './nightmarePredictionService.ts';
import { sharedBus } from '../../agent-orchestrator/shared/sharedMemoryBus.ts';

export interface InterventionCommand {
  id: string;
  timestamp: number;
  type: 'lucid_cue' | 'monitor' | 'gentle_wake' | 'reality_check';
  intensity: number; // 0-1 (0=none, 1=maximum)
  devices: {
    haptic?: boolean;
    audio?: boolean;
    light?: boolean;
  };
  duration: number; // milliseconds
  reason: string;
}

class LucidDreamInterventionRouterImpl extends Service {
  static serviceType = 'intervention-router';
  private subscriptionId: string = '';
  private activationCount = 0;
  private lastInterventionTime = 0;

  async initialize(runtime: IAgentRuntime): Promise<void> {
    logger.info('[InterventionRouter] Initializing lucid dream intervention router');

    // Subscribe to nightmare predictions
    this.subscriptionId = sharedBus.subscribe('nightmare_prediction', (entry) => {
      const prediction = entry.payload as NightmarePrediction;
      this.routeIntervention(prediction);
    });
  }

  private routeIntervention(prediction: NightmarePrediction): void {
    // Decision logic: what intervention to send based on nightmare risk
    const command = this.createInterventionCommand(prediction);

    logger.info(
      '[InterventionRouter] Routing intervention: ' +
        command.type +
        ' (intensity: ' +
        command.intensity.toFixed(2) +
        ')'
    );

    // Emit intervention command to shared bus
    sharedBus.emit({
      source: 'OneiraBrain',
      platform: 'bci',
      type: 'intervention_command',
      payload: command,
    });

    this.activationCount++;
  }

  private createInterventionCommand(prediction: NightmarePrediction): InterventionCommand {
    const now = Date.now();
    const timeSinceLastIntervention = now - this.lastInterventionTime;

    // Don't intervene more than once per minute
    if (timeSinceLastIntervention < 60000) {
      return {
        id: 'no-op-' + now,
        timestamp: now,
        type: 'monitor',
        intensity: 0,
        devices: {},
        duration: 0,
        reason: 'rate_limited',
      };
    }

    // Intervention decision tree
    if (prediction.recommendation === 'intervene') {
      // High nightmare risk: trigger lucid dream cue
      const command: InterventionCommand = {
        id: 'lucid-cue-' + now,
        timestamp: now,
        type: 'lucid_cue',
        intensity: Math.min(1, prediction.nightmareRisk / 100),
        devices: {
          haptic: true, // 3-pulse pattern to wrist
          audio: true, // 40Hz binaural beats
          light: false,
        },
        duration: 3000, // 3 second cue sequence
        reason: 'high_nightmare_risk_' + prediction.severity + '/10_severity',
      };

      this.lastInterventionTime = now;
      return command;
    }

    if (prediction.recommendation === 'prevent') {
      // Moderate risk: gentle intervention (binaural beats only)
      const command: InterventionCommand = {
        id: 'gentle-wake-' + now,
        timestamp: now,
        type: 'gentle_wake',
        intensity: 0.5,
        devices: {
          haptic: false,
          audio: true, // Slow binaural beats (10Hz alpha)
          light: false,
        },
        duration: 5000, // 5 seconds
        reason: 'moderate_nightmare_risk',
      };

      this.lastInterventionTime = now;
      return command;
    }

    // Low risk: monitor only
    return {
      id: 'monitor-' + now,
      timestamp: now,
      type: 'monitor',
      intensity: 0,
      devices: {},
      duration: 0,
      reason: 'low_nightmare_risk',
    };
  }

  getActivationStats(): { count: number; lastTime: number } {
    return {
      count: this.activationCount,
      lastTime: this.lastInterventionTime,
    };
  }

  async disconnect(): Promise<void> {
    sharedBus.subscribe('nightmare_prediction', () => {});
    logger.info('[InterventionRouter] Disconnected');
  }
}

export const lucidDreamInterventionRouter = new LucidDreamInterventionRouterImpl();
