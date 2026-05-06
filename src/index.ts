import { logger, type IAgentRuntime, type Project, type ProjectAgent } from '@elizaos/core';
import dreamPlugin from './plugins/dream/index.ts';
import { character } from './character.ts';
import { researchCharacter } from './characters/researchAgent.ts';
import { communityCharacter } from './characters/communityAgent.ts';
import { orchestratorCharacter } from './characters/orchestratorAgent.ts';

const initCharacter = ({ runtime }: { runtime: IAgentRuntime }) => {
  logger.info('Initializing Oneira');
  logger.info({ name: character.name }, 'Name:');
};

export const projectAgent: ProjectAgent = {
  character,
  init: async (runtime: IAgentRuntime) => await initCharacter({ runtime }),
  plugins: [dreamPlugin],
};

const project: Project = {
  agents: [
    { character, init: async (runtime: IAgentRuntime) => await initCharacter({ runtime }), plugins: [dreamPlugin] },  // Oneira (Twitter)
    { character: researchCharacter },                                                                                    // OneiraResearch (Reddit + RSS)
    { character: communityCharacter },                                                                                   // OneiraCommunity (Discord)
    { character: orchestratorCharacter },                                                                                // OneiraOrchestrator (Internal coordinator)
  ],
};

export { character } from './character.ts';

export default project;
