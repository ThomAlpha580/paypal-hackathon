"""A single research agent with a configurable Responses client."""

from functools import lru_cache

from agents import (
    Agent,
    ModelSettings,
    OpenAIResponsesModel,
    WebSearchTool,
    set_tracing_disabled,
)
from openai import AsyncOpenAI

from app.alpha.backtest import backtest_tool
from app.core.config import get_settings

SYSTEM_PROMPT = """You are a professional quantitative researcher specializing in factor discovery and analysis for the Chinese A-share market."""


TITLE_MAX_CHARS = 20


@lru_cache(maxsize=1)
def get_model_client() -> AsyncOpenAI:
    settings = get_settings()
    return AsyncOpenAI(
        base_url=settings.openai_base_url,
        api_key=settings.openai_api_key,
        timeout=120,
        max_retries=1,
    )


def build_agent() -> Agent:
    settings = get_settings()
    set_tracing_disabled(not settings.agent_tracing_enabled)
    return Agent(
        name="FactorResearchAgent",
        instructions=SYSTEM_PROMPT,
        model=OpenAIResponsesModel(
            model=settings.openai_model, openai_client=get_model_client()
        ),
        model_settings=ModelSettings(parallel_tool_calls=False),
        tools=[WebSearchTool(), backtest_tool],
    )


async def close_model_client() -> None:
    if get_model_client.cache_info().currsize:
        await get_model_client().close()
        get_model_client.cache_clear()
