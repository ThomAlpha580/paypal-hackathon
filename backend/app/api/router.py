from fastapi import APIRouter

from app.api.auth import router as auth_router
from app.api.screener import router as screener_router
from app.api.decision.router import router as decision_router
from app.api.billing import router as billing_router
from app.api.agent.router import router as agent_router
from app.api.payment_orders import router as payment_orders_router
from app.api.paypal_billing import router as paypal_billing_router
from app.api.alpha.router import router as alpha_router
from app.api.alpha.factors import router as alpha_factors_router


api_router = APIRouter(prefix="/api")
api_router.include_router(auth_router)
api_router.include_router(decision_router)
api_router.include_router(screener_router)
api_router.include_router(billing_router)
api_router.include_router(agent_router)
api_router.include_router(payment_orders_router)
api_router.include_router(paypal_billing_router)
api_router.include_router(alpha_router)
api_router.include_router(alpha_factors_router)
