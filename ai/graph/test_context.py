from context_builder import GraphContextBuilder


builder = GraphContextBuilder()

try:
    context = builder.build_person_connection_context(
        "PERSON_f9d8f1ef",
        "PERSON_fa1242b3"
    )

    print("\n--- GRAPH CONTEXT ---")
    print(context)

finally:
    builder.close()