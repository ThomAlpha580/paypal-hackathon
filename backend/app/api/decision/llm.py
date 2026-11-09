import asyncio
import json
from dataclasses import dataclass
from datetime import datetime
from functools import lru_cache
from pathlib import Path
from typing import Any, AsyncIterator
from zoneinfo import ZoneInfo

import json_stream
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.services.supabase_client import get_supabase_client


PROMPTS_DIR = Path(__file__).resolve().parent / "prompts"

MARKET_TIMEZONES: dict[str, str] = {
    "korea": "Asia/Seoul",
    "china": "Asia/Shanghai",
    "hongkong": "Asia/Hong_Kong",
    "coin": "UTC",
    "monad": "UTC",
    "solana": "UTC",
}


class Operation(BaseModel):
    type: str = Field(description="Operation type: buy/sell/hold")
    price: float = Field(description="Reference price for this operation. The value should be `0` when type is `hold`")
    amount: float = Field(description="Suggested transaction volume (number of shares)")
    EV: float = Field(description="Expected rate of return (a decimal between 0 and 1)")
    confidence: float = Field(description="Confidence level (a decimal between 0 and 1, representing your level of confidence in the analysis)")


class Result(BaseModel):
    analysis: str
    operation: list[Operation]


@dataclass
class DecisionTaskStreamState:
    analysis: str = ""
    status: str = "processing"
    error: str | None = None
    done: bool = False


_STREAM_STATES: dict[str, DecisionTaskStreamState] = {}
_STREAM_LOCK = asyncio.Lock()


async def initialize_task_stream(task_id: str) -> None:
    async with _STREAM_LOCK:
        _STREAM_STATES[task_id] = DecisionTaskStreamState()


async def has_task_stream(task_id: str) -> bool:
    async with _STREAM_LOCK:
        return task_id in _STREAM_STATES


async def stream_task_analysis(task_id: str) -> AsyncIterator[str]:
    last_analysis: str | None = None
    while True:
        async with _STREAM_LOCK:
            state = _STREAM_STATES.get(task_id)
            if state is None:
                missing = True
                analysis = ""
                done = True
                status = "not_found"
            else:
                missing = False
                analysis = state.analysis
                done = state.done
                status = state.status

        if missing:
            yield _sse_event({"analysis": ""}, event="not_found")
            return

        if analysis != last_analysis:
            yield _sse_event({"analysis": analysis})
            last_analysis = analysis

        if done:
            yield _sse_event({"analysis": analysis}, event=status)
            return

        await asyncio.sleep(0.3)


async def run_decision_analysis(
    task_id: str,
    report_markdown: str,
    market: str,
    metadata: list[dict[str, str]] | None = None,
) -> None:
    await initialize_task_stream(task_id)
    await _update_decision_task(task_id, {"status": "processing"})

    output_text = ""
    input_tokens = 0
    output_tokens = 0

    try:
        client = _make_client()
        settings = get_settings()
        stream = await client.aio.models.generate_content_stream(
            model=settings.google_genai_model,
            contents=_build_user_prompt(report_markdown, market, metadata),
            config=types.GenerateContentConfig(
                system_instruction=_get_system_prompt(market),
                response_mime_type="application/json",
                response_schema=Result.model_json_schema(),
            ),
        )

        async for chunk in stream:
            try:
                chunk_text = getattr(chunk, "text", None) or ""
            except ValueError:
                chunk_text = ""
            if chunk_text:
                output_text += chunk_text
                analysis = _extract_partial_analysis(output_text)
                await _set_stream_analysis(task_id, analysis)

            usage_metadata = getattr(chunk, "usage_metadata", None)
            if usage_metadata:
                input_tokens = usage_metadata.prompt_token_count or input_tokens
                output_tokens = usage_metadata.candidates_token_count or output_tokens

        result = Result.model_validate_json(output_text)
        await _update_decision_task(
            task_id,
            {
                "analysis_content": result.analysis,
                "operation_suggestion": [
                    operation.model_dump() for operation in result.operation
                ],
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "status": "completed",
            },
        )
        await _finish_stream(task_id, result.analysis, "completed")
    except Exception as exc:
        message = str(exc) or exc.__class__.__name__
        await _update_decision_task(task_id, {"status": "failed"})
        await _finish_stream(task_id, _extract_partial_analysis(output_text), "failed", message)


def _make_client() -> genai.Client:
    settings = get_settings()
    settings.validate_google_genai()
    return genai.Client(api_key=settings.google_genai_api_key, vertexai=True)


def _build_user_prompt(
    report_markdown: str,
    market: str,
    metadata: list[dict[str, str]] | None = None,
) -> str:
    additional_information = _build_additional_information(market, metadata)
    return f"""Please analyze the following stock market report and produce the structured result.

```markdown
{report_markdown}
```

{additional_information}
"""


def _build_additional_information(
    market: str,
    metadata: list[dict[str, str]] | None = None,
) -> str:
    lines = [
        "**Additional Information:**",
        f"- Current Time: {_current_market_time(market)}",
    ]
    for item in metadata or []:
        label = _single_line(item.get("label", ""))
        value = _single_line(item.get("value", ""))
        if label and value:
            lines.append(f"- {label}: {value}")
    return "\n".join(lines)


def _current_market_time(market: str) -> str:
    timezone = ZoneInfo(MARKET_TIMEZONES.get(market, "UTC"))
    return datetime.now(timezone).strftime("%Y-%m-%d %H:%M:%S %Z")


def _single_line(value: str) -> str:
    return " ".join(str(value).split())


@lru_cache
def _get_system_prompt(market: str) -> str:
    if not market.replace("_", "").replace("-", "").isalnum():
        raise ValueError(f"Invalid market for system prompt: {market}")

    prompt_market = "coin" if market in {"monad", "solana"} else market
    return (PROMPTS_DIR / f"system-{prompt_market}.md").read_text(encoding="utf-8")


def _extract_partial_analysis(buffer: str) -> str:
    try:
        parsed = json_stream.load([buffer], persistent=True)
        analysis = parsed.get("analysis")
        if isinstance(analysis, str):
            return analysis
    except Exception:
        pass
    return _extract_partial_json_string(buffer, "analysis")


def _extract_partial_json_string(buffer: str, key: str) -> str:
    marker = json.dumps(key)
    key_index = buffer.find(marker)
    if key_index < 0:
        return ""

    colon_index = buffer.find(":", key_index + len(marker))
    if colon_index < 0:
        return ""

    quote_index = buffer.find('"', colon_index + 1)
    if quote_index < 0:
        return ""

    chars: list[str] = []
    index = quote_index + 1
    while index < len(buffer):
        char = buffer[index]
        if char == '"':
            break
        if char != "\\":
            chars.append(char)
            index += 1
            continue

        if index + 1 >= len(buffer):
            break
        escape = buffer[index + 1]
        if escape == "u":
            hex_value = buffer[index + 2 : index + 6]
            if len(hex_value) < 4 or any(c not in "0123456789abcdefABCDEF" for c in hex_value):
                break
            chars.append(chr(int(hex_value, 16)))
            index += 6
            continue

        chars.append(
            {
                '"': '"',
                "\\": "\\",
                "/": "/",
                "b": "\b",
                "f": "\f",
                "n": "\n",
                "r": "\r",
                "t": "\t",
            }.get(escape, escape)
        )
        index += 2

    return "".join(chars)


async def _set_stream_analysis(task_id: str, analysis: str) -> None:
    async with _STREAM_LOCK:
        state = _STREAM_STATES.setdefault(task_id, DecisionTaskStreamState())
        state.analysis = analysis


async def _finish_stream(
    task_id: str,
    analysis: str,
    status: str,
    error: str | None = None,
) -> None:
    async with _STREAM_LOCK:
        state = _STREAM_STATES.setdefault(task_id, DecisionTaskStreamState())
        state.analysis = analysis
        state.status = status
        state.error = error
        state.done = True


async def _update_decision_task(task_id: str, values: dict[str, Any]) -> None:
    await asyncio.to_thread(
        lambda: get_supabase_client()
        .table("decision_tasks")
        .update(values)
        .eq("id", task_id)
        .execute()
    )


def _sse_event(data: dict[str, Any], event: str | None = None) -> str:
    lines = []
    if event:
        lines.append(f"event: {event}")
    lines.append(f"data: {json.dumps(data, ensure_ascii=False)}")
    return "\n".join(lines) + "\n\n"
