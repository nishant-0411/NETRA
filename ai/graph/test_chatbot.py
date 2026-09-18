from graph_chatbot import GraphChatbot
from graph_retriever import GraphRetriever


retriever = GraphRetriever()
chatbot = GraphChatbot()

try:
    sample = retriever.client.execute_query(
        """
        MATCH (p:Person)-[:USES]->(ph:Phone)
        WHERE p.name IS NOT NULL AND ph.phone_number IS NOT NULL
        OPTIONAL MATCH (p)-[:OWNS]->(v:Vehicle)
        OPTIONAL MATCH (p)-[:OWNS]->(a:Account)
        OPTIONAL MATCH (p)-[:HAS_LICENSE]->(l:License)
        RETURN
            p.person_id AS person_id,
            p.name AS name,
            ph.phone_number AS phone_number,
            v.registration_number AS registration_number,
            a.account_number AS account_number,
            l.license_number AS license_number
        LIMIT 1
        """
    )

    if not sample:
        raise SystemExit("Neo4j does not contain a Person with a phone to test.")

    person = sample[0]
    name = person["name"]
    phone_number = person["phone_number"]

    print("\n--- RESOLVED TEST PERSON FROM NEO4J ---")
    print(person)

    phone_answer = chatbot.answer(
        f"What phone numbers are associated with {name}?"
    )
    print("\n--- PERSON PHONES ---")
    print(phone_answer)
    assert phone_number in phone_answer, phone_answer

    if person.get("registration_number"):
        vehicle_answer = chatbot.answer(
            f"What vehicles does {name} own?"
        )
        print("\n--- PERSON VEHICLES ---")
        print(vehicle_answer)
        assert person["registration_number"] in vehicle_answer, vehicle_answer

    if person.get("account_number"):
        account_answer = chatbot.answer(
            f"What bank accounts does {name} own?"
        )
        print("\n--- PERSON ACCOUNTS ---")
        print(account_answer)
        assert person["account_number"] in account_answer, account_answer

    if person.get("license_number"):
        license_answer = chatbot.answer(
            f"What license does {name} have?"
        )
        print("\n--- PERSON LICENSE ---")
        print(license_answer)
        assert person["license_number"] in license_answer, license_answer

    profile_answer = chatbot.answer(f"Who is {name}?")
    print("\n--- PERSON PROFILE ---")
    print(profile_answer)
    assert name in profile_answer, profile_answer

    people_answer = chatbot.answer(f"Who is connected to {name}?")
    print("\n--- CONNECTED PEOPLE ---")
    print(people_answer)
    assert name in people_answer, people_answer

    other = retriever.client.execute_query(
        """
        MATCH (a:Person {person_id: $person_id})
        MATCH (b:Person)
        WHERE b.person_id <> $person_id AND b.name IS NOT NULL
        MATCH path = shortestPath((a)-[*..4]-(b))
        RETURN b.name AS name
        LIMIT 1
        """,
        {"person_id": person["person_id"]}
    )

    if other:
        other_name = other[0]["name"]
        connection_answer = chatbot.answer(
            f"What is the connection between {name} and {other_name}?"
        )
        print("\n--- PERSON CONNECTION ---")
        print(connection_answer)
        assert name in connection_answer, connection_answer
        assert other_name in connection_answer, connection_answer

    call_sample = retriever.client.execute_query(
        """
        MATCH (ph:Phone)-[c:CALLED]->(other:Phone)
        WHERE ph.phone_number IS NOT NULL AND other.phone_number IS NOT NULL
        RETURN ph.phone_number AS phone_number, other.phone_number AS other_phone
        LIMIT 1
        """
    )

    if call_sample:
        call_phone = call_sample[0]["phone_number"]
        other_phone = call_sample[0]["other_phone"]
        call_answer = chatbot.answer(
            f"What calls were made or received by {call_phone}?"
        )
        print("\n--- PHONE CALLS ---")
        print(call_answer)
        assert call_phone in call_answer, call_answer
        assert other_phone in call_answer, call_answer

        outgoing_answer = chatbot.answer(
            f"What calls were made by {call_phone}?"
        )
        print("\n--- PHONE OUTGOING CALLS ---")
        print(outgoing_answer)
        assert call_phone in outgoing_answer, outgoing_answer
        assert other_phone in outgoing_answer, outgoing_answer

        incoming_answer = chatbot.answer(
            f"What calls were received by {other_phone}?"
        )
        print("\n--- PHONE INCOMING CALLS ---")
        print(incoming_answer)
        assert call_phone in incoming_answer, incoming_answer
        assert other_phone in incoming_answer, incoming_answer

    missing_answer = chatbot.answer(
        "What phone numbers are associated with a person who is not in this graph?"
    )
    print("\n--- UNKNOWN ENTITY ---")
    print(missing_answer)
    assert "knowledge graph" in missing_answer.lower(), missing_answer

    print("\nLive Neo4j chatbot tests passed.")

finally:
    chatbot.close()
    retriever.close()
