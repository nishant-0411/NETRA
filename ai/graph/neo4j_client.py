import os

from neo4j import GraphDatabase
from pathlib import Path
from dotenv import load_dotenv

_this_dir = Path(__file__).resolve().parent
for _parent in [_this_dir, *_this_dir.parents]:
    _env_candidate = _parent / ".env"
    if _env_candidate.exists():
        load_dotenv(dotenv_path=_env_candidate, override=True)
        break




class Neo4jClient:
    def __init__(self):
        self.uri = os.getenv("NEO4J_URI")
        self.username = os.getenv("NEO4J_USERNAME")
        self.password = os.getenv("NEO4J_PASSWORD")
        self.database = os.getenv("NEO4J_DATABASE", "neo4j")

        if not self.uri:
            raise ValueError("NEO4J_URI is not set")

        if not self.username:
            raise ValueError("NEO4J_USERNAME is not set")

        if not self.password:
            raise ValueError("NEO4J_PASSWORD is not set")

        self.driver = GraphDatabase.driver(
            self.uri,
            auth=(self.username, self.password)
        )

    def verify_connection(self):
        """
        Check whether Neo4j is reachable.
        """
        self.driver.verify_connectivity()
        return True

    def execute_query(self, query, parameters=None):
        """
        Execute a Cypher query and return the records as dictionaries.
        Includes automatic retry on connection drops / SessionExpired.
        """
        parameters = parameters or {}

        for attempt in range(2):
            try:
                with self.driver.session(database=self.database) as session:
                    result = session.run(query, parameters)
                    return [record.data() for record in result]
            except Exception as exc:
                if attempt == 0:
                    try:
                        self.driver = GraphDatabase.driver(
                            self.uri,
                            auth=(self.username, self.password)
                        )
                    except Exception:
                        pass
                else:
                    raise exc

    def close(self):
        """
        Close the Neo4j driver connection.
        """
        self.driver.close()
