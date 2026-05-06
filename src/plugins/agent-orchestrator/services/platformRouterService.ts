import { Service, type IAgentRuntime } from '@elizaos/core';

export class PlatformRouterService extends Service {
  static serviceType = 'platform-router';

  async initialize(_runtime: IAgentRuntime): Promise<void> {}

  async stop(): Promise<void> {}
}
