from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.documents import router as documents_router

from app.api.routes.network import router as network_router
try:
    from app.api.routes.graph import router as graph_router
except ImportError:
    graph_router = None

try:
    from app.api.routes.copilot import router as copilot_router
except ImportError:
    copilot_router = None

try:
    from app.api.routes.cases import router as cases_router
except ImportError:
    cases_router = None


app = FastAPI(
    title="NETRA - Criminal Network Intelligence",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents_router)
app.include_router(network_router)
if graph_router:
    app.include_router(graph_router)
if copilot_router:
    app.include_router(copilot_router)
if cases_router:
    app.include_router(cases_router)

