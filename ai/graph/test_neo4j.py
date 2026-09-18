import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent))

from neo4j_client import Neo4jClient


client = Neo4jClient()

try:
    client.verify_connection()
    print("Neo4j connection successful!")
finally:
    client.close()