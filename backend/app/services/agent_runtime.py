from __future__ import annotations

import asyncio
import logging
import os
from collections.abc import AsyncIterator
from datetime import datetime, timezone
from typing import Any
from urllib.parse import quote, urlsplit

from agents import Agent, RunHooks, Runner, WebSearchTool, set_tracing_disabled
from agents.extensions.memory import SQLAlchemySession
from agents.mcp import MCPServerStdio, create_static_tool_filter
from openai import AsyncOpenAI

from app.core.config import get_settings

logger = logging.getLogger(__name__)



def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _tool_label_key(name: str) -> str:
    return TOOL_LABEL_KEYS.get(name, "agent.progress.execute_tool")


class _ProgressHooks(RunHooks):
    """Translate Agents SDK tool lifecycle callbacks into client-facing steps."""

    def __init__(self, queue: asyncio.Queue):
        self.queue = queue

    async def on_tool_start(self, context, agent, tool) -> None:
        tool_name = getattr(context, "tool_name", getattr(tool, "name", "tool"))
        await self.queue.put({
            "type": "step",
            "step": {
                "id": getattr(context, "tool_call_id", f"tool-{id(context)}"),
                "tool": tool_name,
                "label": _tool_label_key(tool_name),
                "status": "running",
                "started_at": _utc_now(),
            },
        })

    async def on_tool_end(self, context, agent, tool, result) -> None:
        tool_name = getattr(context, "tool_name", getattr(tool, "name", "tool"))
        await self.queue.put({
            "type": "step",
            "step": {
                "id": getattr(context, "tool_call_id", f"tool-{id(context)}"),
                "tool": tool_name,
                "label": _tool_label_key(tool_name),
                "status": "completed",
                "completed_at": _utc_now(),
            },
        })


def _model():
    settings = get_settings()
    from agents.models.openai_responses import OpenAIResponsesModel
    client = AsyncOpenAI(api_key=settings.openai_api_key, base_url=settings.openai_base_url)
    return OpenAIResponsesModel(model=settings.openai_model, openai_client=client)


def _web_search_step(data) -> dict[str, Any] | None:
    # Hosted tools execute on the provider, so local RunHooks do not cover them.
    if data.type not in {"response.output_item.added", "response.output_item.done"}:
        return None
    item = data.item
    if item.type != "web_search_call":
        return None
    started = data.type == "response.output_item.added"
    return {
        "type": "step",
        "step": {
            "id": item.id,
            "tool": "web_search",
            "label": _tool_label_key("web_search"),
            "status": "running" if started else item.status,
            "started_at" if started else "completed_at": _utc_now(),
        },
    }


def _render_citations(text: str, annotations) -> str:
    """Make provider URL annotations usable in the existing Markdown message API."""
    spans: dict[tuple[int, int], list[str]] = {}
    for annotation in annotations:
        if annotation.type != "url_citation":
            continue
        start, end = annotation.start_index, annotation.end_index
        if not 0 <= start <= end <= len(text):
            continue
        if urlsplit(annotation.url).scheme not in {"http", "https"}:
            continue
        title = " ".join((annotation.title or "Source").split())
        for char in "\\[]":
            title = title.replace(char, "\\" + char)
        url = quote(annotation.url, safe="/:?#@!$&'*+,;=%")
        spans.setdefault((start, end), []).append(f"[{title}]({url})")
    rendered, cursor = [], 0
    for (start, end), links in sorted(spans.items()):
        if start < cursor:
            continue
        rendered.append(text[cursor:start])
        cited = text[start:end]
        # Some providers annotate prose rather than a dedicated citation marker.
        if not cited.startswith("\ue200cite"):
            rendered.append(cited + " ")
        rendered.append(" ".join(links))
        cursor = end
    rendered.append(text[cursor:])
    return "".join(rendered)


def _cited_content(result) -> str | None:
    parts = []
    has_citations = False
    for item in result.new_items:
        if item.type != "message_output_item":
            continue
        for part in item.raw_item.content:
            if part.type == "output_text":
                has_citations |= any(a.type == "url_citation" for a in part.annotations)
                parts.append(_render_citations(part.text, part.annotations))
    return "".join(parts) if has_citations else None


async def run_agent(user_id: str, conversation_id: str, prompt: str) -> AsyncIterator[dict[str, Any]]:
    settings = get_settings()
    # Model requests use the configured OpenAI-compatible endpoint, while the
    # Agents SDK tracing exporter otherwise posts to api.openai.com.  Disable
    # that exporter by default for custom endpoints to avoid a non-fatal 401
    # on every run.  Set AGENT_TRACING_ENABLED=true only when a valid OpenAI
    # tracing credential is available.
    set_tracing_disabled(not settings.agent_tracing_enabled)
    session = None
    try:
        session = SQLAlchemySession.from_url(
            f"es:{user_id}:{conversation_id}",
            url=settings.agent_session_database_url,
            create_tables=False,
            ensure_ascii=False,
        )
        server = MCPServerStdio(
            name="yfinance",
            params={"command": os.getenv("YFINANCE_MCP_COMMAND", "uvx"), "args": [os.getenv("YFINANCE_MCP_PACKAGE", "yfmcp@latest")]},
            cache_tools_list=True,
            client_session_timeout_seconds=settings.agent_mcp_client_timeout_seconds,
            tool_filter=create_static_tool_filter(allowed_tool_names=YFINANCE_TOOLS),
        )
        agent = Agent(
            name="Stock Research Agent",
            model=_model(),
            mcp_servers=[server],
            tools=[WebSearchTool(external_web_access=True)],
        )
        async with server:
            events: asyncio.Queue = asyncio.Queue()
            result = Runner.run_streamed(
                agent,
                prompt,
                session=session,
                max_turns=settings.agent_max_tool_calls,
                hooks=_ProgressHooks(events),
            )

            async def collect_stream() -> None:
                try:
                    async for event in result.stream_events():
                        await events.put({"type": "sdk", "event": event})
                except asyncio.CancelledError:
                    raise
                except Exception as exc:
                    await events.put({"type": "error", "error": exc})
                finally:
                    await events.put({"type": "done"})

            stream_task = asyncio.create_task(collect_stream())
            try:
                while True:
                    item = await events.get()
                    if item["type"] == "done":
                        break
                    if item["type"] == "error":
                        raise item["error"]
                    if item["type"] == "step":
                        yield item
                        continue
                    event = item["event"]
                    if event.type == "raw_response_event":
                        search_step = _web_search_step(event.data)
                        if search_step is not None:
                            yield search_step
                    if (
                        event.type == "raw_response_event"
                        and getattr(event.data, "type", "") == "response.output_text.delta"
                    ):
                        yield {"type": "delta", "delta": event.data.delta}
                cited_content = _cited_content(result)
                if cited_content is not None:
                    yield {"type": "content", "content": cited_content}
            finally:
                if not stream_task.done():
                    stream_task.cancel()
                await asyncio.gather(stream_task, return_exceptions=True)
    finally:
        # SQLAlchemySession does not implement close(); from_url() owns an
        # AsyncEngine and the caller is responsible for disposing that engine.
        # Cleanup must not turn an otherwise successful run into a failed run.
        engine = getattr(session, "engine", None)
        if engine is not None:
            try:
                await engine.dispose()
            except Exception:
                logger.exception("Failed to dispose Agent SQLAlchemy engine")
