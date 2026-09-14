from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# pyrefly: ignore [missing-import]
from app.api.routes.documents import router as documents_router
# pyrefly: ignore [missing-import]
from app.api.routes.graph import router as graph_router
# pyrefly: ignore [missing-import]
from app.api.routes.copilot import router as copilot_router
# pyrefly: ignore [missing-import]
from app.api.routes.cases import router as cases_router
# pyrefly: ignore [missing-import]
from app.api.routes.auth import router as auth_router
from app.api.routes.case_access import router as case_access_router

app = FastAPI(
    title="criminal-network-analysis",
    version="0.1.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents_router)
app.include_router(graph_router)
app.include_router(copilot_router)
app.include_router(cases_router)
app.include_router(auth_router)
app.include_router(case_access_router)
