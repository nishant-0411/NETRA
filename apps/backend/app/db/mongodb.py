import os
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")

if not MONGO_URI:
    raise RuntimeError("MONGO_URI is not set in the environment")

client = MongoClient(MONGO_URI)

# Mongodb - 1 (History Data Store)
master_db = client["netra_master"]

# Mongodb - 2 (Active Data Store)
active_db = client["netra_active"]
