import { Service, IAgentRuntime, logger } from '@elizaos/core';
import { InterventionCommand } from './lucidDreamInterventionRouter.ts';
import { sharedBus } from '../../agent-orchestrator/shared/sharedMemoryBus.ts';

export interface AudioBinaural {
  name: string;
  leftFreq: number; // Hz
  rightFreq: number; // Hz
  carrierFreq: number; // Base frequency (usually 200-400 Hz)
  duration: number; // milliseconds
  volume: number; // 0-1
}

class AudioOutputServiceImpl extends Service {
  static serviceType = 'audio-output';
  private audioContext: AudioContext | null = null;
  private unsubscribe: (() => void) | null = null;
  private isPlaying = false;

  private binauralFrequencies: Record<string, AudioBinaural> = {
    lucid_40hz: {
      name: 'Gamma 40Hz (Lucid Dreaming)',
      leftFreq: 144, // 144 Hz
      rightFreq: 104, // 104 Hz
      carrierFreq: 200, // Difference = 40 Hz
      duration: 3000,
      volume: 0.3,
    },
    alpha_10hz: {
      name: 'Alpha 10Hz (Relaxation)',
      leftFreq: 210,
      rightFreq: 200,
      carrierFreq: 200, // Difference = 10 Hz
      duration: 5000,
      volume: 0.25,
    },
    theta_6hz: {
      name: 'Theta 6Hz (Deep Meditation)',
      leftFreq: 206,
      rightFreq: 200,
      carrierFreq: 200, // Difference = 6 Hz
      duration: 8000,
      volume: 0.2,
    },
  };

  async initialize(runtime: IAgentRuntime): Promise<void> {
    logger.info('[AudioOutput] Initializing binaural beat audio system');

    // Create Web Audio API context
    try {
      const AudioContextClass = (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();
      logger.info('[AudioOutput] Web Audio API initialized');
    } catch (error) {
      logger.warn('[AudioOutput] Web Audio API not available - simulation mode');
      this.audioContext = null;
    }

    // Subscribe to intervention commands
    this.unsubscribe = sharedBus.subscribe('intervention_command', (entry) => {
      const command = entry.payload as InterventionCommand;
      if (command.devices.audio) {
        this.playBinauralBeats(command);
      }
    });
  }

  private playBinauralBeats(command: InterventionCommand): void {
    if (this.isPlaying) {
      logger.warn('[AudioOutput] Already playing audio, skipping command');
      return;
    }

    let audio: AudioBinaural;

    // Select binaural frequency based on intervention type
    switch (command.type) {
      case 'lucid_cue':
        audio = this.binauralFrequencies.lucid_40hz;
        break;
      case 'gentle_wake':
        audio = this.binauralFrequencies.alpha_10hz;
        break;
      case 'reality_check':
        audio = this.binauralFrequencies.theta_6hz;
        break;
      default:
        return;
    }

    logger.info('[AudioOutput] Playing: ' + audio.name + ' for ' + audio.duration + 'ms');

    this.isPlaying = true;

    if (this.audioContext) {
      this.generateBinauralBeats(audio, command.intensity);
    } else {
      // Simulation mode
      logger.debug('[AudioOutput] [SIM] Playing ' + audio.name);
    }

    // Reset playing flag after duration
    setTimeout(() => {
      this.isPlaying = false;
    }, audio.duration);

    // Log to shared bus
    sharedBus.emit({
      source: 'OneiraBrain',
      platform: 'bci',
      type: 'audio_executed',
      payload: {
        frequency: audio.name,
        binauralDifference: audio.rightFreq - audio.leftFreq,
        duration: audio.duration,
        intensity: command.intensity,
      },
    });
  }

  private generateBinauralBeats(audio: AudioBinaural, intensity: number): void {
    if (!this.audioContext) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const duration = audio.duration / 1000;

    // Create left channel oscillator
    const leftOsc = ctx.createOscillator();
    leftOsc.frequency.value = audio.leftFreq;
    const leftGain = ctx.createGain();
    leftGain.gain.value = audio.volume * intensity * 0.5;
    leftOsc.connect(leftGain);

    // Create right channel oscillator
    const rightOsc = ctx.createOscillator();
    rightOsc.frequency.value = audio.rightFreq;
    const rightGain = ctx.createGain();
    rightGain.gain.value = audio.volume * intensity * 0.5;
    rightOsc.connect(rightGain);

    // Create stereo panner to send left osc to left channel, right osc to right channel
    const leftPan = ctx.createStereoPanner();
    leftPan.pan.value = -1; // Full left
    leftGain.connect(leftPan);

    const rightPan = ctx.createStereoPanner();
    rightPan.pan.value = 1; // Full right
    rightGain.connect(rightPan);

    // Connect to destination
    leftPan.connect(ctx.destination);
    rightPan.connect(ctx.destination);

    // Play for duration
    leftOsc.start(now);
    rightOsc.start(now);
    leftOsc.stop(now + duration);
    rightOsc.stop(now + duration);

    logger.debug(
      '[AudioOutput] Binaural: ' +
        audio.leftFreq.toFixed(0) +
        'Hz (L) - ' +
        audio.rightFreq.toFixed(0) +
        'Hz (R) = ' +
        (audio.rightFreq - audio.leftFreq).toFixed(0) +
        'Hz difference'
    );
  }

  isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }

  async disconnect(): Promise<void> {
    if (this.audioContext) {
      await this.audioContext.close();
    }
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    logger.info('[AudioOutput] Disconnected');
  }
}

export const audioOutputService = new AudioOutputServiceImpl();
