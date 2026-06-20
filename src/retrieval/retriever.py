import hashlib
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings
from src.config import config
from src.retrieval.chroma_store import ChromaStore
from src.utils.logging import get_logger, log_cache_event

logger = get_logger(__name__)

class Retriever:
    def __init__(self, project_id: str):
        self.embeddings = OpenAIEmbeddings(
            model=config.EMBEDDING_MODEL_NAME,
            openai_api_key=config.GITHUB_TOKEN,
            openai_api_base="https://models.github.ai/inference"
        )
        self.vectorstore = Chroma(
            client=ChromaStore.get_client(),
            collection_name=project_id,
            embedding_function=self.embeddings,
        )
        self._cache = {}
        self.project_id = project_id

    def search(self, query: str, k: int = 5):
        query_hash = hashlib.md5(f"{self.project_id}:{query}".encode('utf-8')).hexdigest()
        
        if query_hash in self._cache:
            log_cache_event(logger, "hit", query_hash, query=query)
            return self._cache[query_hash]
            
        log_cache_event(logger, "miss", query_hash, query=query)
        
        try:
            # returns (Document, score) pairs
            results = self.vectorstore.similarity_search_with_relevance_scores(query, k=k)
        except Exception as e:
            # Empty or non-existent collection — return empty results gracefully
            logger.warning(
                f"Search failed for project '{self.project_id}' (likely empty collection): {e}",
                extra={"custom_fields": {"project_id": self.project_id}}
            )
            return []
        
        evidence_list = []
        for doc, score in results:
            evidence_list.append({
                "chunk_id": doc.metadata.get("chunk_id"),
                "source_file": doc.metadata.get("source_file"),
                "page_number": doc.metadata.get("page_number"),
                "section_title": doc.metadata.get("section_title"),
                "score": score,
                "content": doc.page_content
            })
            
        self._cache[query_hash] = evidence_list
        return evidence_list

