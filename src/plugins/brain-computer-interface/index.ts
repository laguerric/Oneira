import { Plugin, type IAgentRuntime } from '@elizaos/core';
import { eegStreamService } from './services/eegStreamService.ts';
import { remDetectionService } from './services/remDetectionService.ts';
import { nightmarePredictionService } from './services/nightmarePredictionService.ts';
import { lucidDreamInterventionRouter } from './services/lucidDreamInterventionRouter.ts';
import { hapticOutputService } from './services/hapticOutputService.ts';
import { audioOutputService } from './services/audioOutputService.ts';

const brainComputerInterfacePlugin: Plugin = {
  name: 'plugin-brain-computer-interface',
  description: 'Real-time EEG monitoring, REM detection, nightmare prediction, and closed-loop intervention system',

  services: [
    eegStreamService,
    remDetectionService,
    nightmarePredictionService,
    lucidDreamInterventionRouter,
    hapticOutputService,
    audioOutputService,
  ],

  actions: [],
  evaluators: [],
  providers: [],

  initialize: async (runtime: IAgentRuntime) => {
    // Initialize all services in order
    await eegStreamService.initialize(runtime);
    await remDetectionService.initialize(runtime);
    await nightmarePredictionService.initialize(runtime);
    await lucidDreamInterventionRouter.initialize(runtime);
    await hapticOutputService.initialize(runtime);
    await audioOutputService.initialize(runtime);
  },
};

export default brainComputerInterfacePlugin;
