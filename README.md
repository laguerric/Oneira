# Oneira

**An autonomous AI agent that thinks, tweets, and dreams.**

Oneira is a self-operating AI persona built on [ElizaOS](https://github.com/elizaos/elizaos) that maintains a persistent presence on X/Twitter. During the day, Oneira engages in conversations, shares insights, and replies to mentions. At midnight, it does something no other bot does — it **dreams**. The day's conversations are synthesized into a surreal, cinematic scene description, which is then rendered into a short AI-generated video and posted as a tweet.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Oneira Agent                     │
│                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │  Character   │  │   Twitter    │  │   Dream    │ │
│  │  Engine      │  │   Plugin     │  │   Plugin   │ │
│  │             │  │              │  │            │ │
│  │ Personality  │  │ Post/Reply   │  │ Synthesis  │ │
│  │ System Prompt│  │ Timeline     │  │ Video Gen  │ │
│  │ Style Rules  │  │ Mentions     │  │ Cron Job   │ │
│  └─────────────┘  └──────────────┘  └────────────┘ │
│                                                     │
│  ┌─────────────────────────────────────────────────┐│
│  │              ElizaOS Runtime                    ││
│  │   Memory · State · Model Routing · Services     ││
│  └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
         │                │                │
    Claude API       X/Twitter API      fal.ai
   (Anthropic)       (OAuth 1.0a)    (Kling 3.0)
```

## The Dream Plugin

The dream system is the core of what makes Oneira unique. It operates as a nightly pipeline:

1. **Context Gathering** — At midnight, the `DreamCronService` collects all of the day's tweets, replies, and interactions from the agent's memory store.

2. **Dream Synthesis** — The accumulated context is sent to Claude with a specialized prompt that acts as Oneira's "unconscious mind." The model produces a 2-3 sentence scene description that is visually evocative, subtly references the day's themes, and reads like a real dream — surreal but internally coherent.

3. **Video Generation** — The dream description is passed to Kling 3.0 (via fal.ai) to produce a 10-second cinematic video. The prompt is prefixed with `"Cinematic, dreamlike, surreal:"` to guide the visual style.

4. **Posting** — The generated video is posted to X/Twitter as Oneira's nightly dream, creating a living archive of the agent's subconscious.

```
Daily Tweets & Replies
        │
        ▼
┌───────────────┐     ┌──────────────┐     ┌───────────┐
│ Memory Store  │────▶│ Claude LLM   │────▶│ Kling 3.0 │
│ (daily context)│     │ (synthesis)  │     │ (video)   │
└───────────────┘     └──────────────┘     └───────────┘
                                                  │
                                                  ▼
                                           Tweet + Video
```

### Plugin Structure

```
src/plugins/dream/
├── index.ts                    # DreamCronService — midnight scheduler
├── actions/
│   └── dreamAction.ts          # Manual dream trigger action
├── providers/
│   └── dailyContext.ts         # Collects daily memories for synthesis
└── services/
    ├── dreamSynthesis.ts       # LLM-powered dream scene generation
    └── videoGeneration.ts      # Kling 3.0 video rendering via fal.ai
```

## Setup

### Prerequisites

- [Bun](https://bun.sh) runtime
- [ElizaOS CLI](https://elizaos.github.io/eliza/) (`bun install -g @elizaos/cli`)
- API keys for: Anthropic (Claude), X/Twitter (OAuth 1.0a), fal.ai

### Installation

```bash
git clone https://github.com/laguerric/Oneira.git
cd Oneira
bun install
cp .env.example .env
# Fill in your API keys in .env
```

### Configuration

All configuration lives in `.env`:

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API key for text generation |
| `TWITTER_API_KEY` | X OAuth 1.0a consumer key |
| `TWITTER_API_SECRET_KEY` | X OAuth 1.0a consumer secret |
| `TWITTER_ACCESS_TOKEN` | X OAuth 1.0a access token |
| `TWITTER_ACCESS_TOKEN_SECRET` | X OAuth 1.0a access token secret |
| `TWITTER_DRY_RUN` | Set to `true` to disable actual posting |
| `TWITTER_POST_INTERVAL_MIN` | Minimum minutes between tweets |
| `TWITTER_POST_INTERVAL_MAX` | Maximum minutes between tweets |
| `FAL_KEY` | fal.ai API key for Kling video generation |

### Running

```bash
# Development mode with hot reload
elizaos dev

# Production
elizaos start
```

### Testing the Dream Pipeline

Simulate a full day of tweets and generate the dream prompt without posting:

```bash
bun run scripts/test-dream-pipeline.ts
```

Test video generation independently:

```bash
bun run scripts/test-fal-video.ts
```

## Deployment

Oneira is configured for Railway deployment:

```bash
# Via Railway CLI
railway login
railway init
railway up

# Or connect the GitHub repo directly from railway.com
```

Add all `.env` variables in the Railway dashboard under **Variables**.

## Character

Oneira's personality, tone, and behavior are defined entirely in `src/character.ts`. The character system controls how the agent writes tweets, responds to mentions, and maintains conversational consistency across interactions. Modify the `bio`, `system`, `style`, and `messageExamples` fields to reshape the persona.

## License

MIT
