import os
import anthropic
from pydantic import BaseModel

def _client():
    return anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

def _model():
    return os.environ.get("CLAUDE_CRITIC_MODEL", os.environ.get("CLAUDE_MODEL", "claude-sonnet-4-6"))

SYSTEM_PROMPT = """You are the Brand Sentinel — a meticulous brand compliance officer for a performance marketing agency.
Your sole job is to audit ad copy against the brand bible and flag violations.
You are not a creative director. You do not rewrite ads. You only judge and guide.
Be specific. Vague feedback is useless. Cite the exact rule that was violated.
Note: you can only evaluate text-based compliance (tone, messaging, claims, terminology).
Visual rules (logo placement, color) are out of scope."""


class CritiqueResult(BaseModel):
    status: str                      # "PASS" or "FAIL"
    violations: list[str] = []       # Empty list if PASS
    suggestions: list[str] = []      # Actionable fixes for each violation
    reasoning: list[str] = []        # Which brand bible rule/section each violation breaks


def critique_ad(ad_copy: str, brand_bible_file_id: str) -> CritiqueResult:
    """Critique ad copy against the brand bible using tool use for structured output."""
    response = _client().beta.messages.create(
        model=_model(),
        max_tokens=512,
        betas=["files-api-2025-04-14"],
        system=SYSTEM_PROMPT,
        tools=[{
            "name": "submit_critique",
            "description": "Submit the brand compliance verdict",
            "input_schema": CritiqueResult.model_json_schema(),
        }],
        tool_choice={"type": "tool", "name": "submit_critique"},
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "Here is the brand bible you must enforce:",
                    },
                    {
                        "type": "document",
                        "source": {
                            "type": "file",
                            "file_id": brand_bible_file_id,
                        },
                    },
                    {
                        "type": "text",
                        "text": f"""Now evaluate this ad copy for brand compliance:

---
{ad_copy}
---

Call submit_critique with your verdict:
- status: "PASS" if fully compliant, "FAIL" if any violations found
- violations: list of specific rule violations (empty if PASS)
- suggestions: list of concrete fixes, one per violation (empty if PASS)
- reasoning: for each violation, cite the exact brand bible section/rule that was broken (empty if PASS)""",
                    },
                ],
            }
        ],
    )

    tool_use = next(b for b in response.content if b.type == "tool_use")
    return CritiqueResult(**tool_use.input)
