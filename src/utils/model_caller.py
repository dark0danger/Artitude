"""
Model caller with retry and fallback support.
"""

import time
import re
import json
from openai import OpenAI
from src.config import config
from src.utils.logging import get_logger

logger = get_logger(__name__)

# openai client pointing at github models
client = OpenAI(
    base_url="https://models.github.ai/inference",
    api_key=config.GITHUB_TOKEN,
)

def _is_quota_error(e: Exception) -> bool:
    """Check if this is a rate-limit/quota error."""
    error_str = str(e).lower()
    return "429" in error_str or "quota" in error_str or "rate" in error_str or "resource exhausted" in error_str

def call_with_fallback(
    messages: list,
    response_format: type = None,
    primary_model_name: str = None,
    fallback_model_names: list[str] = None,
    max_retries: int = None,
    base_delay: float = None,
    client_override: OpenAI = None,
    model_override: str = None,
) -> str:
    """
    Try the primary model, retry on 429s, then fall back to the next model.
    Returns raw text (or JSON string if response_format is set).
    
    If client_override and model_override are provided, they take priority
    over the default client and model chain (used for user-supplied API keys).
    """
    if max_retries is None:
        max_retries = config.MAX_RETRIES
    if base_delay is None:
        base_delay = config.RETRY_BASE_DELAY
    
    active_client = client_override or client
        
    primary_model = model_override or primary_model_name or config.ROUTER_MODEL_NAME
    # Skip fallbacks when using a user-supplied override
    fallbacks = [] if (client_override or model_override) else (fallback_model_names or config.ROUTER_MODEL_FALLBACKS)
    
    model_chain = [primary_model] + list(fallbacks)
    last_exception = None
    
    for model_index, model_name in enumerate(model_chain):
        for attempt in range(max_retries):
            try:
                logger.info(
                    f"Calling model '{model_name}' (attempt {attempt + 1}/{max_retries})",
                    extra={"custom_fields": {"model": model_name, "attempt": attempt + 1}}
                )
                
                if response_format:
                    response = active_client.beta.chat.completions.parse(
                        model=model_name,
                        messages=messages,
                        response_format=response_format
                    )
                    result_text = response.choices[0].message.content
                else:
                    response = active_client.chat.completions.create(
                        model=model_name,
                        messages=messages,
                    )
                    result_text = response.choices[0].message.content
                    
                logger.info(
                    f"Model '{model_name}' succeeded on attempt {attempt + 1}",
                    extra={"custom_fields": {"model": model_name}}
                )
                return result_text
                
            except Exception as e:
                last_exception = e
                
                if not _is_quota_error(e):
                    logger.error(
                        f"Model '{model_name}' failed with non-quota error: {e}",
                        extra={"custom_fields": {"model": model_name, "error": str(e)}}
                    )
                    raise
                
                wait_time = 5.0
                if attempt < max_retries - 1:
                    logger.warning(
                        f"Model '{model_name}' quota hit (attempt {attempt + 1}/{max_retries}). Retrying in {wait_time:.1f}s...",
                        extra={"custom_fields": {"model": model_name, "wait": wait_time}}
                    )
                    time.sleep(wait_time)
                else:
                    if model_index < len(model_chain) - 1:
                        next_model = model_chain[model_index + 1]
                        logger.warning(
                            f"Model '{model_name}' exhausted all {max_retries} retries. Falling back to '{next_model}'...",
                            extra={"custom_fields": {"model": model_name, "fallback": next_model}}
                        )
                    else:
                        logger.error("All models and retries exhausted.")
    
    raise last_exception
