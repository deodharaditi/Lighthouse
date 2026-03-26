# Lighthouse — Multi-Agent Creative Guardrail

An AI system that automates brand compliance QA for performance marketing agencies. Two specialized Claude agents work in a real-time feedback loop: one generates platform-native ad copy, the other enforces brand rules — with a live visualization of every step.

Built as a reference implementation targeting agencies like Gupta Media.

---

## The Problem

At high-velocity agencies, human QA is the slowest part of the creative pipeline. Scaling ad variations across platforms (Meta, Google, TikTok, LinkedIn, Display) means brand rules get missed — wrong tone, forbidden words, specific weight-loss claims, incorrect CTAs. This system catches violations before a human ever sees the draft.

---

## How It Works

```
Brief + Client + Platform
        │
        ▼
  ┌─────────────┐
  │  Generator  │  ← writes platform-native copy using top-performing ad examples
  └──────┬──────┘
         │ draft
         ▼
  ┌─────────────┐
  │   Critic    │  ← audits against Brand Bible via Anthropic Files API
  └──────┬──────┘
         │
    PASS? ──► Approved ✓
         │
    FAIL? ──► Violations + fix suggestions fed back to Generator (max 3 retries)
         │
   3 failures? ──► Escalated to Human Review ⚠
```

Each step streams to the frontend in real time via Server-Sent Events. The UI shows both agents live, highlights what changed between attempts, and lets you inspect the exact brand rule that triggered each violation.

---

## Tech Stack

| Layer | Tool |
|---|---|
| LLM — Generator | Claude Opus 4.6 (`claude-opus-4-6`) |
| LLM — Critic | Claude Sonnet 4.6 (`claude-sonnet-4-6`) |
| Structured output | Anthropic tool use + Pydantic |
| Brand Bible storage | Anthropic Files API |
| Performance context | pandas (CSV few-shot examples) |
| Backend | FastAPI + Server-Sent Events |
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Deployment | Railway (backend) + Vercel (frontend) |

---

## Project Structure

```
Lighthouse/
├── agents/
│   ├── generator.py        # Agent A: ad copywriter (platform-aware, few-shot)
│   └── critic.py           # Agent B: brand compliance sentinel (structured output)
├── data/
│   ├── brand_bible.txt     # Brand guidelines — customisable per client
│   └── top_ads_sample.csv  # Historical top-performing ads per client × platform
├── scripts/
│   └── upload_brand_bible.py   # One-time: uploads brand bible to Anthropic Files API
├── frontend/               # Next.js app (separate deployment)
│   ├── app/
│   │   ├── components/
│   │   │   ├── AgentCard.tsx   # Live agent state card with diff highlighting
│   │   │   └── BriefForm.tsx   # Campaign input bar
│   │   ├── page.tsx            # Main canvas with SSE event handling
│   │   ├── types.ts            # Shared TypeScript types
│   │   └── globals.css         # Custom animations
│   └── .env.local
├── pipeline.py             # State machine: generator ↔ critic retry loop
├── server.py               # FastAPI SSE server
├── requirements.txt
└── README.md
```

---

## Extending This

Lighthouse is designed to be client-agnostic. To adapt it to any brand:

- **Brand bible**: Edit `data/brand_bible.txt` with the client's voice, claims policy, platform rules, and prohibited words — then re-upload via `scripts/upload_brand_bible.py`
- **Ad examples**: Add rows to `data/top_ads_sample.csv` (columns: `client, headline, body, cta, performance_score, platform`) to give the Generator better few-shot context
- **Image generation**: After approval, pass the copy to an image generation API (DALL-E 3, Stability AI) for a visual creative mockup
- **Batch mode**: Use the Anthropic Batches API to generate 50+ variations simultaneously
- **Webhook output**: Replace the SSE stream with a Slack or email notification on approval
