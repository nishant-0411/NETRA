from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from apps.backend.app.db.base import Base

POSTGRESQL_URI = "postgresql+asyncpg://USER:PASSWORD@HOST:PORT/DBNAME"

engine = create_async_engine(POSTGRESQL_URI, echo = False, pool_pre_ping = True)

