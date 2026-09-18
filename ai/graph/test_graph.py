import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent))

from graph_retriever import GraphRetriever


retriever = GraphRetriever()

try:
    print("\n--- NODES ---")

    nodes = retriever.get_graph_overview()

    for node in nodes:
        print(node)

    print("\n--- RELATIONSHIPS ---")

    relationships = retriever.get_relationship_overview()

    for relationship in relationships:
        print(relationship)

    print("\n--- DYNAMIC MULTI-HOP CONNECTION ---")

    sample = retriever.client.execute_query("""
        MATCH (a:Person)-[:USES]->(:Phone)-[:CALLED]-(:Phone)<-[:USES]-(b:Person)
        WHERE a.person_id <> b.person_id
          AND a.name IS NOT NULL
          AND b.name IS NOT NULL
        RETURN a.person_id AS person_a,
               a.name AS name_a,
               b.person_id AS person_b,
               b.name AS name_b
        LIMIT 1
    """)

    if not sample:
        raise SystemExit("Need a phone-mediated person connection in Neo4j.")

    pair = sample[0]
    too_short = retriever.find_connection(
        pair["person_a"],
        pair["person_b"],
        max_hops=1,
    )
    connection = retriever.find_connection(
        pair["person_a"],
        pair["person_b"],
        max_hops=4,
    )

    assert not too_short, "A one-hop search must not find this phone-mediated path."
    assert connection, "A four-hop search must find this phone-mediated path."

    explanation = retriever.explain_connection(connection)
    print(explanation)
    assert pair["name_a"] in explanation
    assert pair["name_b"] in explanation


finally:
    retriever.close()
