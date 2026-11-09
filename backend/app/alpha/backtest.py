"""Qlib service and an SDK function tool with trusted run context."""

from __future__ import annotations

import asyncio
import logging
import uuid
import warnings
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, cast

import numpy as np
import pandas as pd
from agents import function_tool
from agents.tool_context import ToolContext
from sqlalchemy import desc, select, text

from app.alpha.events import RunBuffer
from app.core.config import get_settings
from app.models.alpha import AlphaBacktest, AlphaChatRun, AlphaFactor
from app.services.alpha_db import alpha_session

logger = logging.getLogger(__name__)
_QLIB_INITIALIZED = False
_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="qlib")


@dataclass
class ResearchContext:
    user_id: str
    run_id: uuid.UUID
    buffer: RunBuffer
    attempts: int = 0
    succeeded: bool = False
    tool_lock: asyncio.Lock = field(default_factory=asyncio.Lock)


def init_qlib() -> None:
    global _QLIB_INITIALIZED
    if not _QLIB_INITIALIZED:
        import qlib
        from qlib.config import REG_CN

        warnings.filterwarnings("ignore", category=RuntimeWarning)
        np.seterr(divide="ignore", invalid="ignore")
        logging.getLogger("qlib").setLevel(logging.ERROR)
        qlib.init(provider_uri=get_settings().alpha_qlib_provider_uri, region=REG_CN)
        _QLIB_INITIALIZED = True


def _calculate_ic(df: pd.DataFrame) -> tuple[pd.Series, pd.Series]:
    ic = df.groupby("datetime").apply(
        lambda x: x["factor"].corr(x["label"], method="pearson")
    )
    rank_ic = df.groupby("datetime").apply(
        lambda x: x["factor"].corr(x["label"], method="spearman")
    )
    return cast(pd.Series, ic), cast(pd.Series, rank_ic)


def saved_backtest(run_id: uuid.UUID) -> dict | None:
    with alpha_session() as db:
        factor = db.execute(select(AlphaFactor).where(AlphaFactor.chat_run_id == run_id)).scalar_one_or_none()
        if factor is None:
            return None
        backtest = db.execute(select(AlphaBacktest).where(AlphaBacktest.factor_id == factor.id)).scalar_one()
        return {
            "ok": True,
            "factor_id": str(factor.id),
            "backtest_id": str(backtest.id),
            "name": factor.name,
            "expr": factor.expr,
            "index": factor.index,
            "result": backtest.results,
            "backtest_params": backtest.params,
        }


@function_tool(name_override="backtest", failure_error_function=None)
async def backtest_tool(
    ctx: ToolContext[ResearchContext], factor_name: str, factor_expr: str
) -> dict[str, Any]:
    context = ctx.context
    async with context.tool_lock:
        call_id = ctx.tool_call_id
        await context.buffer.message(
            "activity",
            call_id,
            activity_type="backtest",
            payload={
                "tool_name": "backtest",
                "factor_name": factor_name,
                "expr": factor_expr,
            },
        )
        if context.succeeded:
            result = {"ok": False, "error_code": "backtest_already_completed"}
        elif context.attempts >= get_settings().alpha_backtest_max_attempts:
            result = {"ok": False, "error_code": "backtest_attempt_limit"}
        elif (
            not factor_name.strip()
            or len(factor_name) > 100
            or not factor_expr.strip()
            or len(factor_expr) > 2000
        ):
            context.attempts += 1
            result = {"ok": False, "error_code": "invalid_factor_input"}
        else:
            context.attempts += 1
            loop = asyncio.get_running_loop()
            result = await loop.run_in_executor(
                _executor,
                run_backtest,
                context.user_id,
                context.run_id,
                factor_name,
                factor_expr,
            )
        await context.buffer.message(
            "activity",
            call_id,
            activity_type="backtest",
            status="completed" if result.get("ok") else "failed",
            payload={
                "tool_name": "backtest",
                "factor_name": factor_name,
                "expr": factor_expr,
                "error_code": result.get("error_code"),
            },
        )
        if result.get("ok"):
            context.succeeded = True
            await context.buffer.message(
                "factor",
                call_id,
                status="completed",
                payload={
                    "factor_id": result["factor_id"],
                    "backtest_id": result["backtest_id"],
                    "name": result["name"],
                    "expr": result["expr"],
                    "index": result["index"],
                    "backtest_result": result["result"],
                },
            )
        return result
