import { Service, type IAgentRuntime } from '@elizaos/core';

export class AgentRegistryService extends Service {
  static serviceType = 'agent-registry';

  async initialize(_runtime: IAgentRuntime): Promise<void> {}

  async stop(): Promise<void> {}
}
