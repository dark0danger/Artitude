from typing import TypedDict, List, Dict, Optional, Any

class AgentState(TypedDict, total=False):
    query: str
    project_id: str
    project_name: str
    image_path: Optional[str]
    parent_review_id: Optional[str]
    parent_review: Optional[Dict[str, Any]]
    routing_decision: str
    retrieved_context: List[Dict[str, Any]]
    visual_analysis: Dict[str, Any]
    raw_synthesis: str
    design_review: Dict[str, Any]
    validation_passed: bool
    recursion_count: int
    errors: List[str]
    queue: Any
    ai_provider: Optional[str]  # 'gpt4o' or 'gemini'
    ai_api_key: Optional[str]   # user-supplied API key

