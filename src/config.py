import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "text-embedding-004")
    EMBEDDING_DIMENSION = int(os.getenv("EMBEDDING_DIMENSION", "768"))
    EMBEDDING_MODEL_VERSION = os.getenv("EMBEDDING_MODEL_VERSION", "v1")
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

    # Add more configuration parameters as needed
    
config = Config()
