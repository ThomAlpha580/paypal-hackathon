from functools import lru_cache

from openai import OpenAI

from app.core.config import get_settings
from app.core.prompts import get_system_prompt
from app.models.screener import Filters


@lru_cache
def get_openai_client() -> OpenAI:
    settings = get_settings()
    settings.validate_openai()
    return OpenAI(
        api_key=settings.openai_api_key,
        base_url=settings.openai_base_url,
        default_headers={"User-Agent": "EasyQuantServer/1.0"},
    )


def parse_filters(query: str, market: str | None = None) -> Filters:
    settings = get_settings()

    try:
        response = get_openai_client().responses.parse(
            model=settings.openai_model,
            instructions=get_system_prompt(market),
            input=query,
            max_output_tokens=settings.openai_max_output_tokens,
            text_format=Filters,
            prompt_cache_retention="24h",
        )
    except RuntimeError:
        raise
    except Exception as exc:
        raise RuntimeError(f"Failed to parse screener query with OpenAI: {exc}") from exc

    if response.output_parsed is None:
        raise RuntimeError("OpenAI returned an empty structured screener response")
    return response.output_parsed
