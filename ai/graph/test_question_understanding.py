from graph_retriever import GraphRetriever
from question_understanding import QuestionUnderstanding


retriever = GraphRetriever()
understanding = QuestionUnderstanding(retriever)

try:
    sample = retriever.client.execute_query(
        """
        MATCH (a:Person)-[:USES]->(:Phone)
        MATCH (b:Person)
        WHERE a.name IS NOT NULL
          AND b.name IS NOT NULL
          AND toLower(a.name) <> toLower(b.name)
        MATCH path = shortestPath((a)-[*..4]-(b))
        RETURN a.name AS name_a, b.name AS name_b
        LIMIT 1
        """
    )

    if not sample:
        raise SystemExit("Need two connected people in Neo4j to test understanding.")

    person_a = sample[0]["name_a"]
    person_b = sample[0]["name_b"]

    parsed_connection = understanding.understand(
        f"What is the connection between {person_a} and {person_b}?"
    )
    print("--- PERSON_CONNECTION ---")
    print(parsed_connection)
    assert parsed_connection["intent"] == "PERSON_CONNECTION"
    mentioned = [item["name"] for item in parsed_connection["persons"]]
    assert person_a in mentioned
    assert person_b in mentioned

    parsed_phones = understanding.understand(
        f"What phone numbers are associated with {person_a}?"
    )
    print("\n--- PERSON_PHONES ---")
    print(parsed_phones)
    assert parsed_phones["intent"] == "PERSON_PHONES"

    call_sample = retriever.client.execute_query(
        """
        MATCH (source:Phone)-[:CALLED]->(destination:Phone)
        WHERE source.phone_number IS NOT NULL
          AND destination.phone_number IS NOT NULL
        RETURN source.phone_number AS source_phone,
               destination.phone_number AS destination_phone
        LIMIT 1
        """
    )

    if call_sample:
        source_phone = call_sample[0]["source_phone"]
        destination_phone = call_sample[0]["destination_phone"]

        parsed_outgoing = understanding.understand(
            f"What calls were made by {source_phone}?"
        )
        print("\n--- PHONE_OUTGOING_CALLS ---")
        print(parsed_outgoing)
        assert parsed_outgoing["intent"] == "PHONE_OUTGOING_CALLS"

        parsed_incoming = understanding.understand(
            f"What calls were received by {destination_phone}?"
        )
        print("\n--- PHONE_INCOMING_CALLS ---")
        print(parsed_incoming)
        assert parsed_incoming["intent"] == "PHONE_INCOMING_CALLS"

    parsed_unknown = understanding.understand(
        "Who is involved in this investigation?"
    )
    print("\n--- UNKNOWN ---")
    print(parsed_unknown)
    assert parsed_unknown["intent"] == "UNKNOWN"

    print("\nLive Neo4j question understanding tests passed.")

finally:
    retriever.close()
