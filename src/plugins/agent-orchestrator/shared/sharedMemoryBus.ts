import { randomUUID } from 'crypto';

export interface BusEntry {
  id: string;
  source: string;
  platform: string;
  type: string;
  payload: any;
  timestamp: string;
  processed: boolean;
}

class SharedMemoryBusImpl {
  private entries: BusEntry[] = [];
  private listeners: Map<string, ((entry: BusEntry) => void)[]> = new Map();

  emit(entry: Omit<BusEntry, 'id' | 'timestamp' | 'processed'>): BusEntry {
    const full: BusEntry = {
      ...entry,
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      processed: false,
    };
    this.entries.push(full);
    const handlers = this.listeners.get(entry.type) ?? [];
    for (const handler of handlers) {
      try {
        handler(full);
      } catch (_) {}
    }
    return full;
  }

  subscribe(type: string, handler: (entry: BusEntry) => void): () => void {
    const list = this.listeners.get(type) ?? [];
    list.push(handler);
    this.listeners.set(type, list);
    return () => {
      const updated = (this.listeners.get(type) ?? []).filter((h) => h !== handler);
      this.listeners.set(type, updated);
    };
  }

  getUnprocessed(type?: string): BusEntry[] {
    return this.entries.filter((e) => !e.processed && (!type || e.type === type));
  }

  markProcessed(id: string): void {
    const entry = this.entries.find((e) => e.id === id);
    if (entry) entry.processed = true;
  }

  getAll(since?: Date): BusEntry[] {
    if (!since) return [...this.entries];
    return this.entries.filter((e) => new Date(e.timestamp) >= since);
  }
}

export const sharedBus = new SharedMemoryBusImpl();
