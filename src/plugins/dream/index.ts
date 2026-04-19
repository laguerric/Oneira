import { type Plugin } from '@elizaos/core';
import { dailyContextProvider } from './providers/dailyContext.ts';

/**
 * The Dream plugin — adds nightly dream synthesis to Oneira.
 * TODO: Add dream synthesis service, video generation, and cron scheduling.
 */
const dreamPlugin: Plugin = {
  name: 'plugin-dream',
  description: 'Nightly dream pipeline: synthesizes daily conversations into surreal video dreams',
  actions: [],
  providers: [dailyContextProvider],
  services: [],
};

export default dreamPlugin;
