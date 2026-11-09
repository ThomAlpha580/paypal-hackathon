from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

RunStatus = Literal['queued', 'running', 'completed', 'failed', 'cancelled']


class CreateRunRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra='forbid')
    conversation_id: UUID | None = None
    content: str = Field(min_length=1, max_length=20000)
    client_message_id: str | None = Field(default=None, min_length=1, max_length=255)


class RenameConversationRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra='forbid')
    title: str = Field(min_length=1, max_length=80)


class DeleteConversationResponse(BaseModel):
    conversation_id: UUID
    status: Literal['deleted']


class RunResponse(BaseModel):
    run_id: UUID
    conversation_id: UUID
    user_message_id: UUID
    status: RunStatus


class RunDetail(BaseModel):
    id: UUID
    conversation_id: UUID
    user_message_id: UUID
    assistant_message_id: UUID | None = None
    status: RunStatus
    error_code: str | None = None
    error_message: str | None = None
    input_tokens: int = 0
    output_tokens: int = 0
    steps: list[dict] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
    started_at: datetime | None = None
    completed_at: datetime | None = None
