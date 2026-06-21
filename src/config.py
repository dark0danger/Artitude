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


def resolve_ai_client(ai_provider: str = None, ai_api_key: str = None):
    """
    Return (client, model_name) based on the user's provider choice and key.
    Falls back to the .env defaults when no overrides are given.
    """
    from openai import OpenAI

    provider = (ai_provider or "").lower().strip()
    key = (ai_api_key or "").strip()

    if provider == "gemini":
        api_key = key or config.GEMINI_API_KEY
        if not api_key:
            raise ValueError("No Gemini API key provided and none configured on the server.")
        client = OpenAI(
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
            api_key=api_key,
        )
        return client, "gemini-2.0-flash"

    # Default: gpt4o via GitHub Models
    api_key = key or config.GITHUB_TOKEN
    if not api_key:
        raise ValueError("No GPT-4o API key provided and none configured on the server.")
    client = OpenAI(
        base_url="https://models.github.ai/inference",
        api_key=api_key,
    )
    return client, "openai/gpt-4o"
