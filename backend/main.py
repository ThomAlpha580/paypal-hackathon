from fastapi import FastAPI

from app.api.auth import router as auth_router
from app.api.router import api_router


def create_app() -> FastAPI:
    app = FastAPI(title="Stock Screener Server")
    app.include_router(auth_router)
    app.include_router(api_router)
    return app


app = create_app()
