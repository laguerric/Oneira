#!/usr/bin/env bun
import chalk from 'chalk';
import readline from 'readline';

// ── Space Grey Palette ──
const dim = chalk.hex('#6e6e73');
const muted = chalk.hex('#8e8e93');
const silver = chalk.hex('#a1a1a6');
const bright = chalk.hex('#f5f5f7');
const accent = chalk.hex('#86868b');
const border = chalk.hex('#3a3a3c');
const success = chalk.hex('#30d158');
const warn = chalk.hex('#ffd60a');
const err = chalk.hex('#ff453a');
const info = chalk.hex('#64d2ff');

// ── Box Drawing ──
const W = 76; // fixed box width
const TL = '╭', TR = '╮', BL = '╰', BR = '╯';
const H = '─', V = '│';

function stripAnsi(s: string): number {
  return s.replace(/\x1b\[[0-9;]*m/g, '').length;
}

function pad(line: string): string {
  const vis = stripAnsi(line);
  const space = Math.max(0, W - 4 - vis);
  return `${border(V)} ${line}${' '.repeat(space)} ${border(V)}`;
}

function boxTop(): string { return border(`${TL}${H.repeat(W - 2)}${TR}`); }
function boxBot(): string { return border(`${BL}${H.repeat(W - 2)}${BR}`); }
function boxSep(): string { return border(`├${H.repeat(W - 2)}┤`); }

function box(lines: string[]): string {
  return [boxTop(), ...lines.map(pad), boxBot()].join('\n');
}

// ── ASCII Logo ──
const LOGO_LINES = [
  '  ██████╗ ███╗   ██╗███████╗██╗██████╗  █████╗',
  ' ██╔═══██╗████╗  ██║██╔════╝██║██╔══██╗██╔══██╗',
  ' ██║   ██║██╔██╗ ██║█████╗  ██║██████╔╝███████║',
  ' ██║   ██║██║╚██╗██║██╔══╝  ██║██╔══██╗██╔══██║',
  ' ╚██████╔╝██║ ╚████║███████╗██║██║  ██║██║  ██║',
  '  ╚═════╝ ╚═╝  ╚═══╝╚══════╝╚═╝╚═╝  ╚═╝╚═╝  ╚═╝',
];

// ── Screens ──

function splash(): string {
  const lines = [
    '',
    ...LOGO_LINES.map(l => silver(l)),
    '',
    dim(' AI Dream Agent Network · Brain-Computer Interface'),
    dim(' Dream Contagion · Nightmare Prevention · ElizaOS'),
    '',
    `${accent(' v1.0.0')} ${dim('·')} ${accent('5 agents')} ${dim('·')} ${accent('4 plugins')} ${dim('·')} ${accent('Dream Network')}`,
    '',
  ];
  return box(lines);
}

function help(): string {
  const lines = [
    bright(' COMMANDS'),
    '',
    `  ${info('list')}              Show all features and capabilities`,
    `  ${info('agents')}            View the 5-agent network`,
    `  ${info('pipeline')}          Dream generation pipeline`,
    `  ${info('contagion')}         Dream Contagion system`,
    `  ${info('bci')}               Brain-Computer Interface`,
    `  ${info('research')}          Clinical research & FDA tools`,
    `  ${info('stack')}             Technology stack`,
    `  ${info('all')}               Display everything`,
    `  ${info('help')}              Show this menu`,
    `  ${info('clear')}             Clear screen`,
    `  ${info('exit')}              Quit`,
    '',
  ];
  return box(lines);
}

function list(): string {
  const lines = [
    bright(' ONEIRA — ALL FEATURES'),
    '',
    accent(' Dream System'),
    `  ${dim('▸')} Nightly autonomous dream synthesis (cron)`,
    `  ${dim('▸')} Dream Contagion — shared dreaming across agents`,
    `  ${dim('▸')} AI video generation (Kling 3.0 / fal.ai)`,
    `  ${dim('▸')} Auto-post to Twitter/X (OAuth 1.0a)`,
    `  ${dim('▸')} Dream fragment emission & theme extraction`,
    `  ${dim('▸')} 12 thematic categories for cross-pollination`,
    '',
    accent(' Brain-Computer Interface'),
    `  ${dim('▸')} 256 Hz 8-channel EEG stream processing`,
    `  ${dim('▸')} REM sleep detection (sawtooth waves, 98%)`,
    `  ${dim('▸')} Nightmare risk prediction (ML, 0-100%)`,
    `  ${dim('▸')} Closed-loop intervention router`,
    `  ${dim('▸')} Binaural beat synthesis (40/10/6 Hz)`,
    `  ${dim('▸')} Haptic feedback patterns (3 modes)`,
    '',
    accent(' Multi-Agent Network'),
    `  ${dim('▸')} 5 specialized agents with distinct roles`,
    `  ${dim('▸')} SharedMemoryBus (in-process pub/sub)`,
    `  ${dim('▸')} Task queue with priority & assignment`,
    `  ${dim('▸')} Platform adapters: Discord, Reddit, RSS`,
    '',
    accent(' Clinical Research'),
    `  ${dim('▸')} Dream biomarker detection (4 conditions)`,
    `  ${dim('▸')} FDA clinical trial manager (RCT framework)`,
    `  ${dim('▸')} Nightmare severity tracking & trends`,
    `  ${dim('▸')} Sleep quality integration (wearables)`,
    `  ${dim('▸')} Longitudinal biomarker trend analysis`,
    '',
    accent(' Social & Data Collection'),
    `  ${dim('▸')} Twitter mention polling & auto-reply`,
    `  ${dim('▸')} Tweet search by topic keywords`,
    `  ${dim('▸')} Reddit dream community monitoring`,
    `  ${dim('▸')} Academic RSS feed tracking (PubMed)`,
    `  ${dim('▸')} Discord mental health community bot`,
    '',
  ];
  return box(lines);
}

function agents(): string {
  const data = [
    ['🌙', 'Oneira', 'Dream Agent', 'Twitter/X', true],
    ['🔬', 'OneiraResearch', 'Research Monitor', 'Reddit + RSS', true],
    ['💬', 'OneiraCommunity', 'Community Support', 'Discord', true],
    ['🎛️', 'OneiraOrchestrator', 'Coordinator', 'Internal', true],
    ['🧠', 'OneiraBrain', 'Neural Interface', 'EEG/BCI', false],
  ] as const;

  const lines = [
    bright(' AGENT NETWORK'),
    '',
  ];

  for (const [icon, name, role, plat, active] of data) {
    const st = active ? success('● active') : warn('○ standby');
    const n = bright(name.padEnd(20));
    const r = muted(role.padEnd(18));
    const p = dim(plat.padEnd(12));
    lines.push(`  ${icon} ${n} ${r} ${p} ${st}`);
  }

  lines.push('');
  lines.push(dim(' Communication: SharedMemoryBus pub/sub architecture'));
  lines.push(dim(' Coordination: TaskQueueService with priority routing'));
  lines.push('');
  return box(lines);
}

function pipeline(): string {
  const steps = [
    ['📥', 'Memory Collection', 'Gather 24h conversations from all platforms'],
    ['🌐', 'Dream Contagion', 'Collect dream echoes from other agents'],
    ['✨', 'Dream Synthesis', 'Claude transforms memories into surreal scene'],
    ['📡', 'Fragment Emission', 'Share dream themes for cross-pollination'],
    ['🎬', 'Video Generation', 'Kling 3.0 / fal.ai renders 10s video'],
    ['🐦', 'Social Posting', 'OAuth 1.0a chunked upload to Twitter/X'],
  ];

  const lines = [
    bright(' DREAM PIPELINE — Nightly at Midnight UTC'),
    '',
  ];

  steps.forEach(([icon, name, desc], i) => {
    lines.push(`  ${icon}  ${bright(`Step ${i + 1}:`)} ${silver(name)}`);
    lines.push(`      ${dim(desc)}`);
    if (i < steps.length - 1) lines.push(`      ${dim('↓')}`);
  });

  lines.push('');
  return box(lines);
}

function contagion(): string {
  const lines = [
    bright(' DREAM CONTAGION — Shared Dreaming'),
    '',
    dim(' How agents influence each other\'s dreams:'),
    '',
    `  ${info('1.')} Agent A dreams → emits ${accent('dream_fragment')} to bus`,
    `  ${info('2.')} Fragment contains: dream text + extracted themes`,
    `  ${info('3.')} Agent B collects fragments before dreaming`,
    `  ${info('4.')} LLM weaves echoes: ${dim('"dreams rhyme, not repeat"')}`,
    `  ${info('5.')} Shared themes become ${accent('contagion vectors')}`,
    '',
    dim(' Theme categories:'),
    `  ${accent('water')}  ${accent('fire')}  ${accent('flight')}  ${accent('darkness')}  ${accent('light')}  ${accent('decay')}`,
    `  ${accent('growth')}  ${accent('machine')}  ${accent('memory')}  ${accent('pursuit')}  ${accent('isolation')}`,
    `  ${accent('transformation')}`,
    '',
    dim(' Viewers see thematic threads weave across dreams'),
    '',
  ];
  return box(lines);
}

function bci(): string {
  const features = [
    ['EEG Stream', '256Hz 8-ch', 'Real-time neural signal processing'],
    ['REM Detection', '98% accuracy', 'Sawtooth wave pattern recognition'],
    ['Nightmare ML', '0-100% risk', 'Multi-factor prediction model'],
    ['Haptic Output', '3 patterns', 'Lucid cue, gentle wake, reality check'],
    ['Binaural Audio', '40/10/6 Hz', 'Gamma, alpha, theta beat synthesis'],
    ['Intervention', 'Closed-loop', 'Automatic nightmare prevention'],
  ];

  const lines = [
    bright(' BRAIN-COMPUTER INTERFACE'),
    '',
    dim(' Real-time EEG monitoring for nightmare prevention'),
    '',
  ];

  for (const [name, spec, desc] of features) {
    const n = bright(name.padEnd(16));
    const s = info(spec.padEnd(14));
    lines.push(`  ${accent('▸')} ${n} ${s} ${dim(desc)}`);
  }

  lines.push('');
  lines.push(dim(' Intervention decision tree:'));
  lines.push(`  ${err('HIGH')} ${dim('(>75%)')}  40Hz gamma + 3-pulse haptic`);
  lines.push(`  ${warn('MED')}  ${dim('(50-75%)')} 10Hz alpha + slow haptic`);
  lines.push(`  ${success('LOW')}  ${dim('(<50%)')}  Monitor only`);
  lines.push('');
  return box(lines);
}

function research(): string {
  const lines = [
    bright(' CLINICAL RESEARCH & FDA READINESS'),
    '',
    `  ${accent('▸')} ${bright('Biomarker Detection')}`,
    `    ${dim('PTSD, Depression, Anxiety, Sleep Disorder')}`,
    `    ${dim('Keyword + theme analysis with confidence scores')}`,
    '',
    `  ${accent('▸')} ${bright('FDA Trial Manager')}`,
    `    ${dim('RCT enrollment, consent, assessment, reporting')}`,
    `    ${dim('Two-sample z-test efficacy analysis')}`,
    '',
    `  ${accent('▸')} ${bright('Nightmare Tracker')}`,
    `    ${dim('Severity 1-10, trend analysis, therapy recs')}`,
    `    ${dim('Longitudinal improvement tracking')}`,
    '',
    `  ${accent('▸')} ${bright('Sleep Integration')}`,
    `    ${dim('Oura / Apple Watch / Whoop correlation')}`,
    `    ${dim('REM fragmentation & HRV analysis')}`,
    '',
    dim(' Data sources: Twitter, Reddit, Discord, RSS feeds'),
    '',
  ];
  return box(lines);
}

function stack(): string {
  const items = [
    ['Runtime', 'ElizaOS v1.7.2 + Bun'],
    ['LLM', 'Claude (Anthropic API)'],
    ['Video', 'Kling 3.0 via fal.ai'],
    ['Social', 'Twitter OAuth 1.0a, Discord.js, Snoowrap'],
    ['EEG', 'Muse.js + FFT.js (256 Hz)'],
    ['Database', 'PGlite (embedded PostgreSQL)'],
    ['Scheduling', 'node-cron (midnight UTC)'],
    ['Frontend', 'React 19 + Vite + Custom CSS'],
    ['Messaging', 'SharedMemoryBus (in-process pub/sub)'],
    ['Validation', 'Zod schema validation'],
  ];

  const lines = [
    bright(' TECH STACK'),
    '',
  ];

  for (const [label, val] of items) {
    lines.push(`  ${accent(label.padEnd(14))} ${dim(val)}`);
  }

  lines.push('');
  return box(lines);
}

function showAll(): void {
  console.log(agents());
  console.log(pipeline());
  console.log(contagion());
  console.log(bci());
  console.log(research());
  console.log(stack());
}

// ── REPL ──

function clearScreen(): void {
  process.stdout.write('\x1b[2J\x1b[H');
}

function prompt(): void {
  process.stdout.write(dim('oneira') + accent(' ▸ '));
}

const COMMANDS: Record<string, () => void> = {
  list: () => console.log(list()),
  agents: () => console.log(agents()),
  pipeline: () => console.log(pipeline()),
  contagion: () => console.log(contagion()),
  bci: () => console.log(bci()),
  research: () => console.log(research()),
  stack: () => console.log(stack()),
  all: showAll,
  help: () => console.log(help()),
  clear: () => { clearScreen(); console.log(splash()); },
};

function main(): void {
  clearScreen();
  console.log(splash());
  console.log(help());

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: dim('oneira') + accent(' ▸ '),
  });

  rl.prompt();

  rl.on('line', (line) => {
    const input = line.trim().toLowerCase();

    if (input === 'exit' || input === 'quit' || input === 'q') {
      clearScreen();
      console.log(dim('\n  Oneira sleeps...\n'));
      process.exit(0);
    }

    if (input !== '') {
      const cmd = COMMANDS[input];
      if (cmd) {
        console.log('');
        cmd();
      } else {
        console.log(`\n  ${dim('Unknown command:')} ${accent(input)} ${dim('— type')} ${info('help')} ${dim('for commands')}\n`);
      }
    }

    rl.prompt();
  });

  rl.on('close', () => {
    console.log(dim('\n  Oneira sleeps...\n'));
    process.exit(0);
  });
}

main();
