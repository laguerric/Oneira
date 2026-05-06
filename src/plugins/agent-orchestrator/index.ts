import { type Plugin } from '@elizaos/core';
import { AgentRegistryService } from './services/agentRegistryService.ts';
import { TaskQueueService } from './services/taskQueueService.ts';
import { PlatformRouterService } from './services/platformRouterService.ts';

const orchestratorPlugin: Plugin = {
  name: 'plugin-agent-orchestrator',
  services: [AgentRegistryService, TaskQueueService, PlatformRouterService],
};

export default orchestratorPlugin;
