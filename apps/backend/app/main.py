from fastapi import FastAPI

from app.api.routes.documents import router as documents_router


app = FastAPI(
    title="criminal-network-analysis",
    version="0.1.0",
)


app.include_router(documents_router)