import os
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient
import certifi

# Search for .env upward from this file's location so MONGO_URI is always found
# regardless of the working directory when the module is imported.
_this_dir = Path(__file__).resolve().parent
for _parent in [_this_dir, *_this_dir.parents]:
    _env_candidate = _parent / ".env"
    if _env_candidate.exists():
        load_dotenv(dotenv_path=_env_candidate, override=True)
        break

MONGO_URI = os.getenv("MONGO_URI")

if not MONGO_URI:
    raise RuntimeError(
        "MONGO_URI is not set. Add it to your .env file at etl/pipelines/.env"
    )

# Use certifi's CA bundle for reliable TLS with MongoDB Atlas.
# If you still get SSL errors, check that your IP is whitelisted in
# MongoDB Atlas → Network Access → IP Access List.
client = MongoClient(
    MONGO_URI,
    tlsCAFile=certifi.where(),
    serverSelectionTimeoutMS=15000,
)

# Mongodb - 1 (History Data Store)
master_db = client["netra_master"]

# Mongodb - 2 (Active Data Store)
active_db = client["netra_active"]
