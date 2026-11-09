"""Short Alpha business transactions; generated entries settle at run end."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from agents.items import TResponseInputItem
from sqlalchemy import select, update

from app.core.config import get_settings
from app.models.alpha import (
    ACTIVE_RUN_STATUSES,
    AlphaBacktest,
    AlphaChat,
    AlphaChatMessage,
    AlphaChatRun,
    AlphaFactor,
)
from app.services.alpha_db import alpha_session


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _as_datetime(value: str | datetime | None) -> datetime | None:
    if value is None or isinstance(value, datetime):
        return value
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def _run_dict(run: AlphaChatRun) -> dict:
    return {
        "id": str(run.id),
        "chat_id": str(run.chat_id),
        "request_id": str(run.request_id),
        "turn_no": run.turn_no,
        "status": run.status,
        "error_code": run.error_code,
        "input_tokens": run.input_tokens,
        "output_tokens": run.output_tokens,
        "revision": run.revision,
        "created_at": run.created_at.isoformat(),
        "updated_at": run.updated_at.isoformat(),
        "started_at": run.started_at.isoformat() if run.started_at else None,
        "finished_at": run.finished_at.isoformat() if run.finished_at else None,
        "heartbeat_at": run.heartbeat_at.isoformat() if run.heartbeat_at else None,
        "charged_at": run.charged_at.isoformat() if run.charged_at else None,
    }


def _message_dict(message: AlphaChatMessage) -> dict:
    return {
        "id": str(message.id),
        "run_id": str(message.run_id),
        "seq": message.seq,
        "type": message.type,
        "content": message.content,
        "activity_type": message.activity_type,
        "status": message.status,
        "source_item_id": message.source_item_id,
        "payload": message.payload or {},
        "revision": message.revision,
        "created_at": message.created_at.isoformat(),
        "updated_at": message.updated_at.isoformat(),
        "finished_at": message.finished_at.isoformat() if message.finished_at else None,
    }


def load_snapshot(run_id: uuid.UUID) -> dict:
    with alpha_session() as db:
        run = db.get(AlphaChatRun, run_id)
        if run is None:
            raise ValueError("run_not_found")
        messages = db.execute(
            select(AlphaChatMessage)
            .where(AlphaChatMessage.run_id == run_id)
            .order_by(AlphaChatMessage.seq)
        ).scalars().all()
        return {"run": _run_dict(run), "messages": [_message_dict(m) for m in messages]}


def start_run(run_id: uuid.UUID) -> dict | None:
    with alpha_session() as db:
        run = db.execute(
            select(AlphaChatRun).where(AlphaChatRun.id == run_id).with_for_update()
        ).scalar_one()
        if run.status != "queued":
            return None
        now = _now()
        run.status = "running"
        run.started_at = now
        run.heartbeat_at = now
        run.updated_at = now
        run.revision += 1
        db.commit()
    return load_snapshot(run_id)


def heartbeat(run_id: uuid.UUID) -> None:
    with alpha_session() as db:
        now = _now()
        db.execute(
            update(AlphaChatRun)
            .where(AlphaChatRun.id == run_id, AlphaChatRun.status.in_(ACTIVE_RUN_STATUSES))
            .values(heartbeat_at=now, updated_at=now)
        )
        db.commit()


def prepare_session(run_id: uuid.UUID) -> tuple[str, list[TResponseInputItem]]:
    with alpha_session() as db:
        run = db.get(AlphaChatRun, run_id)
        if run is None:
            raise ValueError("run_not_found")
        chat = db.execute(
            select(AlphaChat).where(AlphaChat.id == run.chat_id).with_for_update()
        ).scalar_one()
        previous = db.execute(
            select(AlphaChatRun)
            .where(AlphaChatRun.chat_id == chat.id, AlphaChatRun.turn_no < run.turn_no)
            .order_by(AlphaChatRun.turn_no.desc())
            .limit(1)
        ).scalar_one_or_none()
        seed: list[TResponseInputItem] = []
        if previous and previous.status in ("failed", "interrupted"):
            chat.sdk_session_id = str(uuid.uuid4())
            old_runs = db.execute(
                select(AlphaChatRun)
                .where(AlphaChatRun.chat_id == chat.id, AlphaChatRun.turn_no < run.turn_no)
                .order_by(AlphaChatRun.turn_no.desc())
                .limit(get_settings().alpha_context_max_user_turns)
            ).scalars().all()
            for old in reversed(old_runs):
                old_messages = db.execute(
                    select(AlphaChatMessage)
                    .where(AlphaChatMessage.run_id == old.id)
                    .order_by(AlphaChatMessage.seq)
                ).scalars().all()
                for message in old_messages:
                    if message.type in ("user", "ai") and message.content:
                        seed.append(
                            {"role": "user" if message.type == "user" else "assistant", "content": message.content}
                        )
                    elif message.type == "factor":
                        seed.append(
                            {"role": "assistant", "content": f"已保存因子与回测结果：{message.payload}"}
                        )
                if old.status != "completed":
                    seed.append(
                        {"role": "assistant", "content": "本轮执行已中断或失败，以上已保存结果仍有效，不要自动重新回测。"}
                    )
            chat.updated_at = _now()
            db.commit()
        return chat.sdk_session_id, seed


def settle_run(
    snapshot: dict,
    status: str,
    error_code: str | None = None,
    input_tokens: int = 0,
    output_tokens: int = 0,
) -> dict:
    run_id = uuid.UUID(snapshot["run"]["id"])
    with alpha_session() as db:
        run = db.execute(
            select(AlphaChatRun).where(AlphaChatRun.id == run_id).with_for_update()
        ).scalar_one()
        if run.status not in ACTIVE_RUN_STATUSES:
            return load_snapshot(run_id)
        now = _now()
        rows = [dict(row) for row in snapshot["messages"] if row["type"] != "user"]
        factor = db.execute(
            select(AlphaFactor).where(AlphaFactor.chat_run_id == run_id)
        ).scalar_one_or_none()
        if factor and not any(row["type"] == "factor" for row in rows):
            backtest = db.execute(
                select(AlphaBacktest).where(AlphaBacktest.factor_id == factor.id)
            ).scalar_one_or_none()
            rows.append(
                {
                    "id": str(uuid.uuid4()),
                    "run_id": str(run_id),
                    "seq": max((r["seq"] for r in snapshot["messages"]), default=0) + 1,
                    "type": "factor",
                    "content": None,
                    "activity_type": None,
                    "status": "completed",
                    "source_item_id": "recovered_backtest",
                    "payload": {
                        "factor_id": str(factor.id),
                        "backtest_id": str(backtest.id) if backtest else None,
                        "name": factor.name,
                        "expr": factor.expr,
                        "index": factor.index,
                        "backtest_result": backtest.results if backtest else None,
                    },
                    "revision": 1,
                    "created_at": now.isoformat(),
                    "updated_at": now.isoformat(),
                    "finished_at": now.isoformat(),
                }
            )
        for row in rows:
            if row["status"] in ("pending", "running"):
                row["status"] = "completed" if status == "completed" else "interrupted"
                row["revision"] += 1
                row["finished_at"] = now.isoformat()
            message = AlphaChatMessage(
                id=uuid.UUID(row["id"]),
                run_id=run_id,
                seq=row["seq"],
                type=row["type"],
                content=row.get("content"),
                activity_type=row.get("activity_type"),
                status=row["status"],
                source_item_id=row.get("source_item_id"),
                payload=row.get("payload") or {},
                revision=row.get("revision", 1),
                created_at=_as_datetime(row.get("created_at")) or now,
                updated_at=_as_datetime(row.get("updated_at")) or now,
                finished_at=_as_datetime(row.get("finished_at")),
            )
            db.merge(message)
        run.status = status
        run.error_code = error_code
        run.finished_at = now
        run.updated_at = now
        run.input_tokens = max(input_tokens, 0)
        run.output_tokens = max(output_tokens, 0)
        run.revision = max(run.revision, snapshot["run"].get("revision", 0)) + 1
        chat = db.get(AlphaChat, run.chat_id)
        if chat:
            chat.updated_at = now
        db.commit()
    return load_snapshot(run_id)


def active_run_ids() -> list[uuid.UUID]:
    with alpha_session() as db:
        return list(
            db.execute(
                select(AlphaChatRun.id).where(AlphaChatRun.status.in_(ACTIVE_RUN_STATUSES))
            ).scalars()
        )

