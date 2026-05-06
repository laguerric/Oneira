import { Service, IAgentRuntime, logger } from '@elizaos/core';
import { InterventionCommand } from './lucidDreamInterventionRouter.ts';
import { sharedBus } from '../../agent-orchestrator/shared/sharedMemoryBus.ts';

export interface HapticPattern {
  pulses: { duration: number; intensity: number }[]; // Each pulse: duration (ms), intensity (0-1)
  name: string;
}

class HapticOutputServiceImpl extends Service {
  static serviceType = 'haptic-output';
  private deviceConnected = false;
  private subscriptionId: string = '';

  // Pre-programmed haptic patterns for lucid dream triggers
  private patterns: Record<string, HapticPattern> = {
    lucidity_cue: {
      name: 'Lucidity Cue (3-pulse)',
      pulses: [
        { duration: 100, intensity: 0.8 },
        { duration: 150, intensity: 0 }, // gap
        { duration: 100, intensity: 0.8 },
        { duration: 150, intensity: 0 },
        { duration: 100, intensity: 0.8 },
      ],
    },
    gentle_wake: {
      name: 'Gentle Wake (slow pulse)',
      pulses: [
        { duration: 200, intensity: 0.4 },
        { duration: 800, intensity: 0 },
        { duration: 200, intensity: 0.4 },
      ],
    },
    reality_check: {
      name: 'Reality Check (double tap)',
      pulses: [
        { duration: 80, intensity: 0.9 },
        { duration: 80, intensity: 0 },
        { duration: 80, intensity: 0.9 },
      ],
    },
  };

  async initialize(runtime: IAgentRuntime): Promise<void> {
    logger.info('[HapticOutput] Initializing haptic feedback system');

    // Connect to haptic device (wrist/armband with vibration motor)
    const deviceId = process.env.HAPTIC_DEVICE_ID || 'default-haptic';
    this.deviceConnected = await this.connectDevice(deviceId);

    if (!this.deviceConnected) {
      logger.warn('[HapticOutput] Could not connect to haptic device - simulation mode');
    }

    // Subscribe to intervention commands
    this.subscriptionId = sharedBus.subscribe('intervention_command', (entry) => {
      const command = entry.payload as InterventionCommand;
      if (command.devices.haptic) {
        this.executeHapticPattern(command);
      }
    });
  }

  private async connectDevice(deviceId: string): Promise<boolean> {
    try {
      // In production: connect to Bluetooth/USB haptic device
      // For now: simulate connection
      logger.info('[HapticOutput] Connected to haptic device: ' + deviceId);
      return true;
    } catch (error) {
      logger.error('[HapticOutput] Device connection failed:', error);
      return false;
    }
  }

  private executeHapticPattern(command: InterventionCommand): void {
    let pattern: HapticPattern;

    switch (command.type) {
      case 'lucid_cue':
        pattern = this.patterns.lucidity_cue;
        break;
      case 'gentle_wake':
        pattern = this.patterns.gentle_wake;
        break;
      case 'reality_check':
        pattern = this.patterns.reality_check;
        break;
      default:
        return;
    }

    logger.info('[HapticOutput] Executing pattern: ' + pattern.name + ' (intensity: ' + command.intensity + ')');

    // Execute pattern
    this.sendPattern(pattern, command.intensity);

    // Log to shared bus for analytics
    sharedBus.emit({
      source: 'OneiraBrain',
      platform: 'bci',
      type: 'haptic_executed',
      payload: {
        pattern: pattern.name,
        intensity: command.intensity,
        timestamp: command.timestamp,
      },
    });
  }

  private sendPattern(pattern: HapticPattern, intensity: number): void {
    // In production: send to Bluetooth/USB device
    // For now: simulate execution
    let delayOffset = 0;

    pattern.pulses.forEach((pulse) => {
      setTimeout(() => {
        const finalIntensity = pulse.intensity * intensity;
        if (finalIntensity > 0) {
          // Simulate haptic motor activation
          logger.debug('[HapticOutput] Vibrate: ' + (finalIntensity * 100).toFixed(0) + '%');
        }
      }, delayOffset);

      delayOffset += pulse.duration;
    });
  }

  getConnectedStatus(): boolean {
    return this.deviceConnected;
  }

  async disconnect(): Promise<void> {
    sharedBus.subscribe('intervention_command', () => {});
    logger.info('[HapticOutput] Disconnected');
  }
}

export const hapticOutputService = new HapticOutputServiceImpl();
