import os
import json
import hashlib
from functools import lru_cache
from pydantic import ValidationError
import PIL.Image
import base64
import io
from src.vision.tools import VisualAnalysisSchema
from src.config import config
from src.utils.logging import get_logger, log_cache_event
from src.utils.model_caller import call_with_fallback

logger = get_logger(__name__)

def encode_image_to_base64(img: PIL.Image.Image) -> str:
    buffered = io.BytesIO()
    if img.mode != 'RGB':
        img = img.convert('RGB')
    img.save(buffered, format="JPEG")
    return base64.b64encode(buffered.getvalue()).decode("utf-8")

@lru_cache(maxsize=128)
def _analyze_image_cached_internal(file_path: str) -> VisualAnalysisSchema:
    if not os.path.exists(file_path):
        return VisualAnalysisSchema.fallback_error(f"File not found: {file_path}")
        
    try:
        # quick sanity check with pillow
        with PIL.Image.open(file_path) as img:
            img.verify()
        
        # verify() messes with the file pointer, so reopen
        img = PIL.Image.open(file_path)
    except Exception as e:
        return VisualAnalysisSchema.fallback_error(f"Invalid or corrupted image format: {str(e)}")
        
    try:
        prompt = (
            "Analyze this image and extract its visual properties. "
            "IMPORTANT: If the image contains another brand's logo, branding, or identity, "
            "you must point it out and give a negative review in the 'review' field. "
            "Return ONLY a valid JSON object matching this schema."
        )
        
        b64_img = encode_image_to_base64(img)
        
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{b64_img}"
                        }
                    }
                ]
            }
        ]
        
        response_text = call_with_fallback(
            messages=messages,
            response_format=VisualAnalysisSchema,
            primary_model_name=config.VISION_MODEL_NAME,
            fallback_model_names=config.VISION_MODEL_FALLBACKS,
        )
        
        data = json.loads(response_text)
        return VisualAnalysisSchema(**data)
        
    except ValidationError as ve:
        return VisualAnalysisSchema.fallback_error(f"Validation error: {str(ve)}")
    except Exception as e:
        return VisualAnalysisSchema.fallback_error(f"API or network error: {str(e)}")

def analyze_asset(file_path: str) -> VisualAnalysisSchema:
    # wrapper to track cache hits in the logs
    before_info = _analyze_image_cached_internal.cache_info()
    result = _analyze_image_cached_internal(file_path)
    after_info = _analyze_image_cached_internal.cache_info()
    
    if after_info.hits > before_info.hits:
        log_cache_event(logger, "hit", file_path)
    else:
        log_cache_event(logger, "miss", file_path)
        
    return result

