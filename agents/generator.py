import os
import pandas as pd
import anthropic

def _client():
    return anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

def _model():
    return os.environ.get("CLAUDE_MODEL", "claude-opus-4-6")

SYSTEM_PROMPT = """You are Don Draper meets David Ogilvy — a world-class direct-response copywriter.
Your job is to write high-converting ad copy that is emotionally resonant, on-brand, and platform-native.
You write with precision: every word earns its place. You never pad, never cliché, never bore.
When given historical top-performing ads, you study their patterns and channel their energy.

OUTPUT FORMAT — follow this exactly, no deviations:
Headline: <headline text>
Body: <body copy>
CTA: <call to action>

Rules:
- No markdown formatting, no bold, no asterisks, no hashes
- No rationale, commentary, or explanation after the ad
- Output only the three labelled fields above, nothing else"""


def load_top_ads(csv_path: str, client_name: str, platform: str, n: int = 5) -> list[dict]:
    """Load top N ads for a client, preferring platform-specific examples with cross-platform fallback."""
    df = pd.read_csv(csv_path)
    client_ads = df[df["client"].str.lower() == client_name.lower()]
    platform_ads = client_ads[client_ads["platform"].str.lower() == platform.lower()]
    top = platform_ads.nlargest(n, "performance_score")
    # Fall back to all client ads if fewer than 2 platform-specific examples
    if len(top) < 2:
        top = client_ads.nlargest(n, "performance_score")
    return top[["headline", "body", "cta", "performance_score"]].to_dict("records")


def generate_ad(
    brief: str,
    client_name: str,
    platform: str,
    csv_path: str,
    rejection_notes: str | None = None,
) -> str:
    """Call Claude to generate ad copy, optionally incorporating rejection feedback."""
    top_ads = load_top_ads(csv_path, client_name, platform)

    examples_block = "\n\n".join(
        f"Headline: {ad['headline']}\nBody: {ad['body']}\nCTA: {ad['cta']}\n(Score: {ad['performance_score']})"
        for ad in top_ads
    )

    user_message = f"""BRIEF:
{brief}

CLIENT: {client_name}
PLATFORM: {platform}

TOP-PERFORMING ADS FOR THIS CLIENT (study these patterns):
{examples_block}
"""

    if rejection_notes:
        user_message += f"""
PREVIOUS DRAFT WAS REJECTED. Fix these violations and incorporate these suggestions:
{rejection_notes}

Now write a revised ad that passes brand compliance.
"""
    else:
        user_message += "\nWrite a new ad for this brief."

    response = _client().messages.create(
        model=_model(),
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )

    return response.content[0].text
