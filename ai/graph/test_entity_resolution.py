from graph_retriever import GraphRetriever


retriever = GraphRetriever()

try:
    print("\n--- ENTITY RESOLUTION ---")

    result = retriever.find_person_by_name("Advik Maharaj")

    for person in result:
        print(person)

finally:
    retriever.close()