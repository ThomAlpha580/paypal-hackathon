from __future__ import annotations

import json
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select

from app.api.alpha.router import current_user_id
from app.models.alpha import AlphaBacktest, AlphaFactor, BacktestPublic, FactorPublic
from app.services.alpha_db import alpha_session

router = APIRouter(prefix="/alpha/factors", tags=["alpha-factors"])


def _parse_json(value: str | None) -> Any:
    if value is None:
        return None
    try:
        return json.loads(value)
    except (TypeError, json.JSONDecodeError):
        return value


@router.get("", response_model=list[FactorPublic])
def read_factors(user_id: uuid.UUID = Depends(current_user_id)) -> list[FactorPublic]:
    with alpha_session() as db:
        factors = db.execute(
            select(AlphaFactor)
            .where(AlphaFactor.user_id == user_id, AlphaFactor.is_deleted.is_(False))
            .order_by(AlphaFactor.created_at.desc(), AlphaFactor.id.desc())
        ).scalars().all()
        result = []
        for factor in factors:
            backtest = db.execute(
                select(AlphaBacktest)
                .where(AlphaBacktest.factor_id == factor.id)
                .order_by(AlphaBacktest.created_at.asc())
                .limit(1)
            ).scalar_one_or_none()
            result.append(
                FactorPublic(
                    id=factor.id,
                    user_id=factor.user_id,
                    index=factor.index,
                    name=factor.name,
                    expr=factor.expr,
                    created_at=factor.created_at,
                    is_deleted=factor.is_deleted,
                    backtest_result=backtest.results if backtest else None,
                )
            )
        return result


@router.get("/{factor_id}/backtest", response_model=BacktestPublic)
def read_backtest(
    factor_id: uuid.UUID,
    user_id: uuid.UUID = Depends(current_user_id),
) -> BacktestPublic:
    with alpha_session() as db:
        factor = db.get(AlphaFactor, factor_id)
        if factor is None:
            raise HTTPException(404, "factor_not_found")
        if factor.user_id != user_id:
            raise HTTPException(403, "not_enough_permissions")
        backtest = db.execute(
            select(AlphaBacktest)
            .where(AlphaBacktest.factor_id == factor_id)
            .order_by(AlphaBacktest.created_at.asc())
            .limit(1)
        ).scalar_one_or_none()
        if backtest is None:
            raise HTTPException(404, "backtest_not_found")
        return BacktestPublic(
            id=backtest.id,
            factor_id=backtest.factor_id,
            params=backtest.params,
            results=backtest.results,
            ic_detail=_parse_json(backtest.ic_detail),
            report_normal=_parse_json(backtest.report_normal),
            created_at=backtest.created_at,
        )
