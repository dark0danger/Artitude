import logging
import json
from datetime import datetime

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module
        }
        if hasattr(record, "custom_fields"):
            log_data.update(record.custom_fields)
        return json.dumps(log_data)

def get_logger(name):
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(JSONFormatter())
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    return logger

def log_cache_event(logger, event_type: str, key: str, **kwargs):
    fields = {"event_type": event_type, "cache_key": key}
    fields.update(kwargs)
    logger.info(f"Cache {event_type} for key {key}", extra={"custom_fields": fields})

def log_latency(logger, operation: str, latency_ms: float, **kwargs):
    fields = {"operation": operation, "latency_ms": latency_ms}
    fields.update(kwargs)
    logger.info(f"Operation {operation} took {latency_ms:.2f}ms", extra={"custom_fields": fields})
