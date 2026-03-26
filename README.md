# AdAgent — Multi-Agent Creative Guardrail

An AI system that automates QA for high-velocity ad creative pipelines. Two specialized agents work in a feedback loop: one generates ad copy, the other enforces brand compliance.

Built as a reference implementation targeting performance marketing agencies.

---

## The Problem

At high-velocity agencies, human QA is the slowest part of the creative pipeline. Scaling ad variations (50–100 per campaign) means brand rules get missed — wrong tone, forbidden words, incorrect CTAs. This system catches violations before a human ever sees the draft.

## How It Works

```
Brief + Historical Ads
        │
        ▼
  ┌─────────────┐
  │  Generator  │  ← Agent A: writes ad copy using top-performing patterns
  └──────┬──────┘
         │ draft
         ▼
  ┌─────────────┐
  │   Sentinel  │  ← Agent B: audits against Brand Bible PDF
  └──────┬──────┘
         │
    PASS? ──► Final Output (approved ad)
         │
    FAIL? ──► Rejection notes sent back to Generator (max 3 retries)
         │
   3 failures? ──► Escalate to Human Review
```

---

## Tech Stack

| Layer | Tool |
|---|---|
| LLM | Claude Opus 4.6 (`claude-opus-4-6`) |
| Orchestration | Python state machine (no framework) |
| Brand Bible storage | Anthropic Files API |
| Structured output | `client.messages.parse()` + Pydantic |
| Performance context | pandas CSV |
| UI | Streamlit |

---

## Project Structure

```
AdAgent/
├── agents/
│   ├── __init__.py
│   ├── generator.py        # Agent A: ad copy writer
│   └── critic.py           # Agent B: brand compliance sentinel
├── data/
│   ├── brand_bible.pdf     # Client brand guidelines (not committed)
│   └── top_ads.csv         # Historical top-performing ads (not committed)
├── scripts/
│   └── upload_brand_bible.py   # One-time: uploads PDF to Files API
├── pipeline.py             # State machine loop (generator ↔ sentinel)
├── app.py                  # Streamlit dashboard
├── requirements.txt
├── .env.example
└── README.md
```

---

## Setup

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd AdAgent
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:
```
ANTHROPIC_API_KEY=your_api_key_here
BRAND_BIBLE_FILE_ID=         # filled after step 3
```

### 3. Upload your Brand Bible (one-time)

Place your brand guidelines PDF at `data/brand_bible.pdf`, then:

```bash
python scripts/upload_brand_bible.py
```

Copy the printed `FILE_ID` into your `.env`.

### 4. Add historical ad data

Create `data/top_ads.csv` with columns:

```
client,headline,body,cta,ctr
Fender,Discover Your Sound,"Find the guitar that speaks to you.",Shop Now,0.042
...
```

### 5. Run the app

```bash
streamlit run app.py
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `BRAND_BIBLE_FILE_ID` | File ID returned after uploading brand bible |

---

## Agent Personas

**Agent A — The Generator**
> Writes high-converting ad copy using a client brief and few-shot examples drawn from historical top performers. Receives rejection notes and revises on failure.

**Agent B — The Brand Sentinel**
> Audits copy strictly against the Brand Bible. Returns a structured `PASS/FAIL` with specific violation reasons. Has no creative discretion — its only job is to find problems.

---

## Pipeline Behavior

| Scenario | Outcome |
|---|---|
| Copy passes on first attempt | `APPROVED` after 1 iteration |
| Copy fails, revision passes | `APPROVED` after 2–3 iterations |
| 3 consecutive failures | `HUMAN_REVIEW` — flagged for manual QA |

---

## Extending This

- **Add more clients**: Drop new entries in `top_ads.csv` and upload a new brand bible PDF per client
- **Visual asset compliance**: Integrate a vision model pass to check image/banner assets
- **Webhook output**: Replace the Streamlit panel with a Slack/email notification on approval
- **Batch mode**: Use the Anthropic Batches API to generate 50+ variations simultaneously
