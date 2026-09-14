import logging
from typing import Dict, Any
from etl.pipelines.utils import get_langchain_llm
from app.db.mongodb import active_db
from app.services.graph_service import driver

logger = logging.getLogger(__name__)

class RagService:
    @staticmethod
    def query_knowledge_base(question: str) -> Dict[str, Any]:
        """
        Query the Neo4j Knowledge Graph and MongoDB documents using a local Qwen3 LLM.
        """
        logger.info(f"[RAG] Answering query: {question}")
        llm = get_langchain_llm()
        
        # 1. Very basic Graph RAG retrieval via Neo4j
        graph_context = ""
        try:
            with driver.session() as session:
                # Retrieve top nodes and their relationships generically as context
                result = session.run("MATCH (n)-[r]-(m) RETURN labels(n) as l1, n.name as n1, type(r) as rel, labels(m) as l2, m.name as n2 LIMIT 20")
                context_lines = []
                for record in result:
                    context_lines.append(f"{record['l1']} '{record['n1']}' {record['rel']} {record['l2']} '{record['n2']}'")
                graph_context = "\\n".join(context_lines)
        except Exception as e:
            logger.error(f"[RAG] Neo4j query error: {e}")

        # 2. Document RAG retrieval (Simple MongoDB search for simplicity without vector DB)
        doc_context = ""
        try:
            # Simple text match over processed documents
            docs = active_db["processed_documents"].find({}, {"data": 1}).limit(5)
            doc_lines = []
            for d in docs:
                doc_lines.append(str(d.get("data", "")))
            doc_context = "\\n".join(doc_lines)[:2000] # Limit size
        except Exception as e:
            logger.error(f"[RAG] MongoDB query error: {e}")

        prompt = f"""You are a Graph RAG assistant for a criminal investigation platform.
Answer the user's question based on the provided Graph Context and Document Context.

Graph Context:
{graph_context}

Document Context:
{doc_context}

Question:
{question}
"""
        try:
            response = llm.invoke(prompt)
            return {"status": "success", "answer": response.content}
        except Exception as e:
            logger.error(f"[RAG] LLM generation error: {e}")
            return {"status": "error", "message": str(e)}
