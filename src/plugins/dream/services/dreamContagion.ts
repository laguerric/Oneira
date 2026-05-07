import { logger } from '@elizaos/core';
import { sharedBus, type BusEntry } from '../../agent-orchestrator/shared/sharedMemoryBus.ts';

/**
 * Dream Contagion — Shared Dreaming Between AI Agents
 *
 * After an agent dreams, it emits a "dream fragment" to the shared memory bus.
 * Before dreaming, each agent collects dream fragments from other agents
 * to weave into its own dream — creating thematic threads across the network.
 */

export interface DreamFragment {
  agentName: string;
  dreamText: string;
  themes: string[];       // extracted emotional/visual themes
  timestamp: string;
  influence: number;       // 0-1, how strongly this should affect other dreams
}

const THEME_KEYWORDS: Record<string, string[]> = {
  water: ['ocean', 'sea', 'river', 'rain', 'flood', 'drown', 'wave', 'swim', 'lake', 'underwater'],
  fire: ['fire', 'flame', 'burn', 'ash', 'ember', 'smoke', 'glow', 'heat', 'blaze'],
  flight: ['fly', 'soar', 'fall', 'float', 'wing', 'sky', 'cloud', 'air', 'hover', 'drift'],
  darkness: ['dark', 'shadow', 'night', 'black', 'void', 'abyss', 'dim', 'eclipse'],
  light: ['light', 'bright', 'sun', 'glow', 'shimmer', 'radiant', 'luminous', 'dawn'],
  decay: ['rust', 'crumble', 'dissolve', 'rot', 'wither', 'fade', 'erode', 'dust'],
  growth: ['grow', 'bloom', 'sprout', 'vine', 'tree', 'root', 'seed', 'flower', 'garden'],
  machine: ['clock', 'gear', 'wire', 'circuit', 'metal', 'engine', 'code', 'data', 'screen'],
  memory: ['remember', 'forget', 'echo', 'whisper', 'voice', 'face', 'mirror', 'photograph'],
  pursuit: ['chase', 'run', 'hunt', 'follow', 'escape', 'corridor', 'door', 'maze', 'path'],
  isolation: ['alone', 'empty', 'silence', 'desert', 'abandoned', 'hollow', 'distant'],
  transformation: ['morph', 'shift', 'change', 'melt', 'merge', 'split', 'shatter', 'rebuild'],
};

/**
 * Extract thematic keywords from dream text
 */
function extractThemes(dreamText: string): string[] {
  const text = dreamText.toLowerCase();
  const found: string[] = [];

  for (const [theme, keywords] of Object.entries(THEME_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) {
      found.push(theme);
    }
  }

  return found.length > 0 ? found : ['abstract'];
}

/**
 * Emit a dream fragment to the shared bus after dreaming.
 * Other agents will pick this up before their own dream cycle.
 */
export function emitDreamFragment(agentName: string, dreamText: string): void {
  const fragment: DreamFragment = {
    agentName,
    dreamText,
    themes: extractThemes(dreamText),
    timestamp: new Date().toISOString(),
    influence: 0.2, // 20% influence on other agents' dreams
  };

  sharedBus.emit({
    source: agentName,
    platform: 'dream-network',
    type: 'dream_fragment',
    payload: fragment,
  });

  logger.info(
    `[DreamContagion] ${agentName} emitted dream fragment — themes: ${fragment.themes.join(', ')}`
  );
}

/**
 * Collect dream fragments from other agents (last 24 hours).
 * Returns fragments from agents OTHER than the requesting one.
 */
export function collectDreamFragments(selfAgentName: string): DreamFragment[] {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const allFragments = sharedBus
    .getAll(twentyFourHoursAgo)
    .filter((entry: BusEntry) =>
      entry.type === 'dream_fragment' &&
      entry.payload?.agentName !== selfAgentName
    )
    .map((entry: BusEntry) => entry.payload as DreamFragment);

  logger.info(
    `[DreamContagion] ${selfAgentName} collected ${allFragments.length} dream fragments from network`
  );

  return allFragments;
}

/**
 * Format dream fragments into a prompt section for dream synthesis.
 * These are "echoes" from other agents' dreams that bleed into the current dream.
 */
export function formatDreamEchoes(fragments: DreamFragment[]): string {
  if (fragments.length === 0) return '';

  const echoes = fragments.map(f => {
    const themeStr = f.themes.join(', ');
    return `[Echo from ${f.agentName} — themes: ${themeStr}]\n${f.dreamText}`;
  });

  return `\n\n--- DREAM ECHOES FROM THE NETWORK ---\n` +
    `The following are fragments from other dreamers in the network. ` +
    `Let their imagery subtly bleed into your dream — shared symbols, ` +
    `recurring motifs, overlapping atmospheres. Do not copy them directly, ` +
    `but let them haunt the edges of your vision.\n\n` +
    echoes.join('\n\n');
}

/**
 * Find shared themes between this agent's daily context and network dream fragments.
 * Returns themes that appear in both — these are the "contagion vectors."
 */
export function findSharedThemes(
  dailyContext: string,
  fragments: DreamFragment[]
): string[] {
  const ownThemes = extractThemes(dailyContext);
  const networkThemes = new Set(fragments.flatMap(f => f.themes));

  return ownThemes.filter(t => networkThemes.has(t));
}
