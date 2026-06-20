import os
from dotenv import load_dotenv

load_dotenv(override=True)

class Config:
    EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "text-embedding-3-small")
    EMBEDDING_DIMENSION = int(os.getenv("EMBEDDING_DIMENSION", "1536"))
    EMBEDDING_MODEL_VERSION = os.getenv("EMBEDDING_MODEL_VERSION", "v1")
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
    VISION_MODEL_NAME = os.getenv("VISION_MODEL_NAME", "openai/gpt-4o")
    ROUTER_MODEL_NAME = os.getenv("ROUTER_MODEL_NAME", "openai/gpt-4o")
    
    # not using fallbacks right now
    VISION_MODEL_FALLBACKS = []
    ROUTER_MODEL_FALLBACKS = []
    
    MAX_RETRIES = 2
    RETRY_BASE_DELAY = 5  # seconds, exponential backoff

config = Config()
