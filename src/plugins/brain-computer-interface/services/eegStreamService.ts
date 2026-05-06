import { Service, IAgentRuntime, logger } from '@elizaos/core';
import { sharedBus } from '../../agent-orchestrator/shared/sharedMemoryBus.ts';

export interface EEGRawData {
  timestamp: number;
  channels: number[]; // 8 channels for standard headsets
  sampleRate: number; // 256 Hz typical
}

export interface EEGProcessed {
  timestamp: number;
  deltaWaves: number; // 0.5-4 Hz
  thetaWaves: number; // 4-8 Hz
  alphaWaves: number; // 8-12 Hz
  betaWaves: number; // 12-30 Hz
  gammaWaves: number; // 30-100 Hz
  sawtooth: number; // 0-1 confidence score
}

class EEGStreamServiceImpl extends Service {
  static serviceType = 'eeg-stream';
  private wsConnection: WebSocket | null = null;
  private buffer: EEGRawData[] = [];
  private isConnected = false;
  private sampleCounter = 0;

  async initialize(runtime: IAgentRuntime): Promise<void> {
    try {
      const headsetUrl = process.env.EEG_HEADSET_URL || 'ws://localhost:8080';
      this.wsConnection = new WebSocket(headsetUrl);

      this.wsConnection.onopen = () => {
        this.isConnected = true;
        logger.info('[EEGStream] Connected to headset at ' + headsetUrl);
      };

      this.wsConnection.onmessage = (event) => {
        try {
          const rawData = JSON.parse(event.data);
          this.buffer.push({
            timestamp: Date.now(),
            channels: rawData.channels || [],
            sampleRate: 256,
          });

          this.sampleCounter++;
          // Process every 256 samples (1 second window)
          if (this.sampleCounter >= 256) {
            this.processEEGBuffer();
            this.sampleCounter = 0;
          }
        } catch (error) {
          logger.warn('[EEGStream] Parse error:', error);
        }
      };

      this.wsConnection.onerror = (error) => {
        logger.error('[EEGStream] Connection error:', error);
        this.isConnected = false;
      };

      this.wsConnection.onclose = () => {
        this.isConnected = false;
        logger.info('[EEGStream] Disconnected');
        // Attempt reconnection in 5 seconds
        setTimeout(() => this.initialize(runtime), 5000);
      };
    } catch (error) {
      logger.error('[EEGStream] Initialization failed:', error);
    }
  }

  private processEEGBuffer(): void {
    if (this.buffer.length === 0) return;

    const processed = this.computeFrequencyBands();

    // Emit to shared bus for all agents to consume
    sharedBus.emit({
      source: 'OneiraBrain',
      platform: 'bci',
      type: 'eeg_processed',
      payload: {
        eeg: processed,
        bufferSize: this.buffer.length,
      },
    });

    this.buffer = [];
  }

  private computeFrequencyBands(): EEGProcessed {
    // Simplified FFT-like computation from raw channels
    // In production, use real DSP library (e.g., fft.js)
    const allChannels = this.buffer.flatMap((s) => s.channels);
    const avg = allChannels.reduce((a, b) => a + b, 0) / allChannels.length;

    // Pseudo-frequency detection via simple signal analysis
    const variance = allChannels.reduce((sum, v) => sum + (v - avg) ** 2, 0) / allChannels.length;
    const power = Math.sqrt(variance);

    return {
      timestamp: Date.now(),
      deltaWaves: power * 0.15, // 0.5-4 Hz (sleep)
      thetaWaves: power * 0.25, // 4-8 Hz (REM/drowsy)
      alphaWaves: power * 0.2, // 8-12 Hz (relaxed)
      betaWaves: power * 0.25, // 12-30 Hz (awake)
      gammaWaves: power * 0.15, // 30-100 Hz (conscious)
      sawtooth: this.detectSawtooth(), // REM indicator
    };
  }

  private detectSawtooth(): number {
    // Sawtooth waves are a hallmark of REM sleep
    // Look for 2-6 Hz triangular pattern in frontal channels
    if (this.buffer.length < 10) return 0;

    let positiveSlopes = 0;
    let negativeSlopes = 0;

    for (let i = 1; i < this.buffer.length; i++) {
      const delta = this.buffer[i].channels[0] - this.buffer[i - 1].channels[0];
      if (delta > 0.1) positiveSlopes++;
      if (delta < -0.1) negativeSlopes++;
    }

    const totalTransitions = positiveSlopes + negativeSlopes;
    if (totalTransitions === 0) return 0;

    // Sawtooth pattern = rapid alternations between up/down slopes
    const ratio = Math.min(positiveSlopes, negativeSlopes) / Math.max(positiveSlopes, negativeSlopes);
    return Math.max(0, Math.min(1, ratio));
  }

  isConnectedToHeadset(): boolean {
    return this.isConnected;
  }

  getLatestBuffer(): EEGRawData[] {
    return [...this.buffer];
  }

  async disconnect(): Promise<void> {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.isConnected = false;
      logger.info('[EEGStream] Disconnected from headset');
    }
  }
}

export const eegStreamService = new EEGStreamServiceImpl();
