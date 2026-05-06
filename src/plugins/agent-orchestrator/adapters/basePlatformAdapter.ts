export interface PlatformPost {
  id: string;
  platform: string;
  author: string;
  text: string;
  url: string;
  score: number;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface PlatformAdapter {
  platform: string;
  connect(): Promise<void>;
  search(query: string, options?: any): Promise<PlatformPost[]>;
  reply(postId: string, text: string): Promise<void>;
  monitor(keywords: string[], handler: (post: PlatformPost) => void): void;
  disconnect(): Promise<void>;
}
