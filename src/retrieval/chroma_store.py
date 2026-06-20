import chromadb
from chromadb.config import Settings
import os

DB_DIR = os.path.join(os.getcwd(), ".chroma_db")

class ChromaStore:
    _client = None

    @classmethod
    def get_client(cls):
        if cls._client is None:
            cls._client = chromadb.PersistentClient(
                path=DB_DIR,
                settings=Settings(anonymized_telemetry=False)
            )
        return cls._client

    @classmethod
    def get_collection(cls, collection_name="brand_guidelines"):
        client = cls.get_client()
        return client.get_or_create_collection(name=collection_name)
