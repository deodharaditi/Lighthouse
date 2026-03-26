import os
from agents.generator import generate_ad
from agents.critic import critique_ad, CritiqueResult

MAX_RETRIES = int(os.environ.get("MAX_RETRIES", 3))


def run_pipeline(
    brief: str,
    client_name: str,
    platform: str,
    csv_path: str,
    brand_bible_file_id: str,
) -> dict:
    """
    Run the generate → critique state machine loop.

    Returns a dict with:
      - final_ad: the last generated ad copy
      - attempts: number of iterations run
      - history: list of {ad, critique} per attempt
      - outcome: "APPROVED" or "HUMAN_REVIEW"
    """
    history = []
    rejection_notes = None

    for attempt in range(1, MAX_RETRIES + 1):
        ad_copy = generate_ad(
            brief=brief,
            client_name=client_name,
            platform=platform,
            csv_path=csv_path,
            rejection_notes=rejection_notes,
        )

        critique: CritiqueResult = critique_ad(
            ad_copy=ad_copy,
            brand_bible_file_id=brand_bible_file_id,
        )

        history.append({"attempt": attempt, "ad": ad_copy, "critique": critique})

        if critique.status == "PASS":
            return {
                "final_ad": ad_copy,
                "attempts": attempt,
                "history": history,
                "outcome": "APPROVED",
            }

        # Build rejection notes for next iteration
        violation_lines = "\n".join(f"- {v}" for v in critique.violations)
        suggestion_lines = "\n".join(f"- {s}" for s in critique.suggestions)
        rejection_notes = f"Violations:\n{violation_lines}\n\nSuggestions:\n{suggestion_lines}"

    # Exhausted retries — escalate
    return {
        "final_ad": history[-1]["ad"],
        "attempts": MAX_RETRIES,
        "history": history,
        "outcome": "HUMAN_REVIEW",
    }


def run_pipeline_stream(
    brief: str,
    client_name: str,
    platform: str,
    csv_path: str,
    brand_bible_file_id: str,
):
    """Streaming version — yields event dicts for SSE."""
    rejection_notes = None
    last_ad = None

    for attempt in range(1, MAX_RETRIES + 1):
        yield {"event": "generator_start", "attempt": attempt}

        ad_copy = generate_ad(
            brief=brief,
            client_name=client_name,
            platform=platform,
            csv_path=csv_path,
            rejection_notes=rejection_notes,
        )
        last_ad = ad_copy
        yield {"event": "generator_done", "attempt": attempt, "ad": ad_copy}

        critique: CritiqueResult = critique_ad(
            ad_copy=ad_copy,
            brand_bible_file_id=brand_bible_file_id,
        )
        yield {
            "event": "critic_done",
            "attempt": attempt,
            "status": critique.status,
            "violations": critique.violations,
            "suggestions": critique.suggestions,
            "reasoning": critique.reasoning,
        }

        if critique.status == "PASS":
            yield {"event": "pipeline_done", "outcome": "APPROVED", "attempts": attempt, "final_ad": ad_copy}
            return

        violation_lines = "\n".join(f"- {v}" for v in critique.violations)
        suggestion_lines = "\n".join(f"- {s}" for s in critique.suggestions)
        rejection_notes = f"Violations:\n{violation_lines}\n\nSuggestions:\n{suggestion_lines}"

    yield {"event": "pipeline_done", "outcome": "HUMAN_REVIEW", "attempts": MAX_RETRIES, "final_ad": last_ad}
