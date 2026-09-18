from graph_retriever import GraphRetriever


class GraphContextBuilder:
    def __init__(self):
        self.retriever = GraphRetriever()

    def build_person_connection_context(self, person_a, person_b):
        paths = self.retriever.find_connection(
            person_a,
            person_b
        )

        formatted_paths = self.retriever.format_paths(paths)

        if not formatted_paths:
            return "No connection found between the given persons."

        context = "Known connections:\n"

        for path in formatted_paths:
            context += f"- {path}\n"

        return context

    def close(self):
        self.retriever.close()