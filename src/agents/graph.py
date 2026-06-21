import json
import time
from concurrent.futures import ThreadPoolExecutor, TimeoutError
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from src.config import config as app_config, resolve_ai_client
from src.state import AgentState
from src.schemas import ValidationFeedbackSchema, DesignReviewSchema
from src.retrieval.retriever import Retriever
from src.vision.analyzer import analyze_asset
from src.utils.logging import get_logger, log_latency
from src.utils.model_caller import call_with_fallback
from langchain_core.runnables import RunnableConfig
from openai import OpenAI
import PIL.Image
import io
import base64
import os

logger = get_logger(__name__)

TIMEOUT_SECONDS = 120.0

def run_with_timeout(func, timeout_seconds, *args, **kwargs):
    with ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(func, *args, **kwargs)
        return future.result(timeout=timeout_seconds)

def append_error(state: AgentState, error_msg: str):
    errors = state.get("errors", [])
    errors.append(error_msg)
    return {"errors": errors}



def retrieval_node(state: AgentState):
    query = state.get("query", "")
    project_id = state.get("project_id", "default")
    retriever = Retriever(project_id)
    # pad the query with brand-related keywords for better vector search hits
    augmented_query = f"{query} brand guidelines color palette hex typography fonts layout rules".strip()
    context = retriever.search(augmented_query, k=8)
    return {"retrieved_context": context}

def vision_node(state: AgentState):
    """Run vision analysis on the uploaded design."""
    image_path = state.get("image_path")
    
    if not image_path:
        return {"visual_analysis": {"error": "No image provided"}}
        
    analysis_result = analyze_asset(image_path).model_dump()
    return {"visual_analysis": analysis_result}


def synthesis_node(state: AgentState, config: RunnableConfig):
    """Main review node -- builds the 3-part report (consistency, collision, enhancements)."""
    query = state.get("query", "")
    context = state.get("retrieved_context", [])
    vision = state.get("visual_analysis", {})
    count = state.get("recursion_count", 0)
    image_path = state.get("image_path")
    project_id = state.get("project_id", "default")
    project_name = state.get("project_name", "Unknown Brand")
    q = config.get("configurable", {}).get("queue")
    
    # Resolve AI provider from request overrides
    ai_provider = config.get("configurable", {}).get("ai_provider")
    ai_api_key = config.get("configurable", {}).get("ai_api_key")
    user_client, user_model = resolve_ai_client(ai_provider, ai_api_key)
    
    # stitch together the retrieved guideline chunks into a prompt block
    guidelines_summary = ""
    if context:
        guidelines_summary = "\n".join([
            f"- Source: {c.get('source_file', 'unknown')}, Section: {c.get('section_title', 'N/A')}\n  Content: {c.get('content', '')[:500]}"
            for c in context[:5]
        ])
    else:
        guidelines_summary = (
            "NO BRAND GUIDELINES HAVE BEEN INGESTED FOR THIS PROJECT. "
            "You have NO reference material to compare against. "
            "Because of this, the consistency_score MUST be capped at 50 maximum. "
            "You MUST add a finding with element 'Missing Guidelines' and status 'needs_attention' "
            "explaining that no brand guidelines were uploaded, so a reliable consistency check is impossible. "
            "Provide general best-practice feedback only."
        )
    
    vision_summary = json.dumps(vision, indent=2) if vision else "No visual analysis available."
    
    parent_review = state.get("design_review")
    
    parent_review_summary = ""
    if parent_review:
        parent_review_summary = f"""
## PREVIOUS REVIEW (V1)
The designer is uploading a revised version (V2). Here was the previous review:
{json.dumps(parent_review, indent=2)}

**CRITICAL INSTRUCTION**: Since this is a revision, you MUST generate a "Delta Report" in your findings. Compare V1 to V2. Explicitly state what improved, what regressed, and if previous feedback was addressed.
"""

    competitors = []
    base_dir = os.path.join("data", "projects", project_id) if project_id and project_id != "default" else ""
    if base_dir and os.path.exists(os.path.join(base_dir, "competitors.json")):
        try:
            with open(os.path.join(base_dir, "competitors.json"), "r") as f:
                competitors = json.load(f)
        except Exception:
            pass
            
    competitors_summary = ""
    if competitors:
        competitors_summary = "## KNOWN COMPETITORS TO AVOID\nWe have identified the following direct competitors. Ensure the design does NOT resemble their brand kits:\n"
        for c in competitors:
            competitors_summary += f"- {c.get('name', 'Unknown')}: Primary Colors: {c.get('primary_colors', [])}, Typography: {c.get('typography', [])}\n"

    system_prompt = f"""You are Artitude, an expert AI Brand Consistency & Design Enhancement Co-Pilot.

## THE BRAND YOU ARE PROTECTING
You are reviewing a design submitted under the project: **"{project_name}"**.
Your ONLY job is to evaluate whether this uploaded design is consistent with **"{project_name}"**'s brand guidelines listed below.

**CRITICAL RULE — BRAND IDENTITY MISMATCH**:
If the uploaded design clearly depicts, contains, or IS the logo/visual identity of a DIFFERENT brand (e.g., Nike, Adidas, Apple, Coca-Cola, or any other recognizable third-party brand), then:
- The `consistency_score` MUST be between 0-15. It is fundamentally NOT "{project_name}"'s brand.
- Every finding related to that foreign brand identity must be marked "inconsistent".
- Add a finding with element "Brand Identity" explaining that this design belongs to a different brand entirely.
- The Market Collision section MUST flag this as a "high" risk collision.

Do NOT evaluate the design against the foreign brand's own guidelines. You are ONLY checking against "{project_name}".

## DESIGN ASSET VISUAL ANALYSIS
{vision_summary}

## "{project_name}" BRAND GUIDELINES (from RAG)
{guidelines_summary}

{parent_review_summary}

{competitors_summary}

## DESIGNER'S QUESTION
{query if query else "No specific question — provide a general design review."}

## YOUR TASK
Analyze this design and produce a structured review with these three sections:

### 1. Brand Consistency (against "{project_name}" ONLY)
Compare the design's colors, typography, layout density, and visual theme against the "{project_name}" brand guidelines above. Assign a consistency_score (0-100). List specific findings for each element (color palette, fonts, visual tone, etc.) and mark each as "consistent", "inconsistent", or "needs_attention". 
Remember: if this design is clearly from another brand, the score must be near 0.
**IMPORTANT**: For each finding, if it refers to a specific visual element on the image, provide a `bounding_box` as `[x_percentage, y_percentage, width_percentage, height_percentage]` relative percentages (0.0 to 100.0). If it's a general finding, leave it null.

### 2. Market Collision Check
Using your broad knowledge of famous global brands AND the explicit "KNOWN COMPETITORS TO AVOID" list above, check if this design accidentally resembles OR directly copies any visual identity. Consider color schemes, layout patterns, logo styles, wordmarks, and overall aesthetic. 
- If the design IS another brand's asset (e.g., an Adidas logo uploaded to a non-Adidas project), flag it as "high" risk.
- CRITICAL: If the uploaded design's dominant colors or typography match the extracted KNOWN COMPETITORS data, you MUST heavily penalize the design and explicitly generate a "Market Collision Warning" in your findings with a "high" risk level.
- If it merely resembles another brand, flag appropriately as low/medium/high.
Flag any matches with the brand name, what's similar, and a risk level. If no collisions found, return an empty list.

### 3. World-Class Enhancements
Provide actionable, professional-grade suggestions to elevate this design. Cover areas like:
- Typography (modern font pairings, weight hierarchy)
- Color harmony (complementary palettes, contrast ratios)
- Layout (whitespace, visual hierarchy, grid alignment)
- Modern design trends that could apply
Rate each suggestion's impact as low/medium/high.
**IMPORTANT**: For each enhancement, if it refers to a specific area on the image, provide a `bounding_box` as `[x_percentage, y_percentage, width_percentage, height_percentage]` relative percentages (0.0 to 100.0).

For this step, write out your synthesis and Delta Report as a professional design narrative. Do not output JSON yet. Just write the text.
"""

    pil_image = None
    b64_img = None
    if image_path:
        if os.path.exists(image_path):
            pil_image = PIL.Image.open(image_path)
            pil_image.load()  # read into memory so the file handle gets freed
            
            buffered = io.BytesIO()
            if pil_image.mode != 'RGB':
                pil_image = pil_image.convert('RGB')
            pil_image.save(buffered, format="JPEG")
            b64_img = base64.b64encode(buffered.getvalue()).decode("utf-8")
    
    start_time = time.time()
    try:
        messages = [{"role": "system", "content": system_prompt}]
        
        if b64_img:
            messages.append({
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{b64_img}"
                        }
                    }
                ]
            })
        
        # stream the narrative text first using the resolved client
        narrative_stream = user_client.chat.completions.create(
            model=user_model,
            messages=messages,
            stream=True
        )
        
        raw_synthesis = ""
        for chunk in narrative_stream:
            if hasattr(chunk, "choices") and chunk.choices and len(chunk.choices) > 0:
                delta = chunk.choices[0].delta
                content = getattr(delta, "content", None)
                if content:
                    raw_synthesis += content
                    if q:
                        q.put({"type": "token", "data": content})
                    
        # now ask for structured json
        messages.append({"role": "assistant", "content": raw_synthesis})
        messages.append({"role": "user", "content": "Now, output the exact corresponding structured JSON for this analysis matching the required schema."})
        
        def call_api():
            return call_with_fallback(
                messages=messages,
                response_format=DesignReviewSchema,
                primary_model_name=app_config.ROUTER_MODEL_NAME,
                fallback_model_names=app_config.ROUTER_MODEL_FALLBACKS,
                client_override=user_client,
                model_override=user_model,
            )
        response_text = run_with_timeout(call_api, TIMEOUT_SECONDS)
        review_data = json.loads(response_text)
        
        # raw_synthesis was built up from the stream above
        
    except TimeoutError:
        logger.warning("Synthesis node timed out", extra={"custom_fields": {"node": "synthesis"}})
        return {
            "raw_synthesis": "Error: Design review timed out.",
            "design_review": {},
            "recursion_count": count + 1,
            "errors": state.get("errors", []) + ["Synthesis node timed out"]
        }
    except Exception as e:
        logger.error(f"Synthesis node error: {e}", extra={"custom_fields": {"node": "synthesis"}})
        return {
            "raw_synthesis": f"Error: {str(e)}",
            "design_review": {},
            "recursion_count": count + 1,
            "errors": state.get("errors", []) + [f"Synthesis error: {str(e)}"]
        }
        
    latency = (time.time() - start_time) * 1000
    log_latency(logger, "synthesis_node", latency)
    
    return {
        "raw_synthesis": raw_synthesis,
        "design_review": review_data,
        "recursion_count": count + 1
    }

def _format_review_summary(review: dict) -> str:
    """Turn the structured review dict into readable text."""
    parts = []
    
    bc = review.get("brand_consistency", {})
    score = bc.get("consistency_score", "N/A")
    parts.append(f"## Brand Consistency Score: {score}/100")
    for f in bc.get("findings", []):
        parts.append(f"- **{f.get('element', '')}** [{f.get('status', '')}]: {f.get('detail', '')}")
    
    mc = review.get("market_collision", {})
    collisions = mc.get("collisions", [])
    if collisions:
        parts.append(f"\n## Market Collision Alerts ({len(collisions)} found)")
        for c in collisions:
            parts.append(f"- WARNING: **{c.get('brand_name', '')}** ({c.get('risk_level', '')} risk): {c.get('detail', '')}")
    else:
        parts.append("\n## Market Collision Check: No collisions detected")
    
    en = review.get("enhancements", {})
    suggestions = en.get("suggestions", [])
    if suggestions:
        parts.append(f"\n## Enhancement Suggestions ({len(suggestions)})")
        for s in suggestions:
            parts.append(f"- **{s.get('category', '')}** [{s.get('impact', '')} impact]: {s.get('suggestion', '')}")
    
    return "\n".join(parts)

def validator_node(state: AgentState):
    """Quick check that all three sections came back from the model."""
    review = state.get("design_review", {})
    
    # make sure each section is present and not empty
    has_consistency = bool(review.get("brand_consistency", {}).get("findings"))
    has_collision = "collisions" in review.get("market_collision", {})
    has_enhancements = bool(review.get("enhancements", {}).get("suggestions"))
    
    is_valid = has_consistency and has_collision and has_enhancements
    
    if not is_valid and not review:
        # empty review = synthesis blew up, no point retrying
        return {"validation_passed": False}
    
    return {"validation_passed": is_valid}

def build_graph():
    workflow = StateGraph(AgentState)
    
    workflow.add_node("retrieval", retrieval_node)
    workflow.add_node("vision", vision_node)
    workflow.add_node("synthesis", synthesis_node)
    workflow.add_node("validator", validator_node)
    
    workflow.set_entry_point("retrieval")
    
    def retrieval_conditional(state: AgentState):
        if state.get("image_path"):
            return "vision"
        return "synthesis"
        
    workflow.add_conditional_edges(
        "retrieval",
        retrieval_conditional,
        {
            "vision": "vision",
            "synthesis": "synthesis"
        }
    )
    
    workflow.add_edge("vision", "synthesis")
    workflow.add_edge("synthesis", "validator")
    
    def validator_conditional(state: AgentState):
        # bail after 3 tries, or if it passed, or if the review is empty (hard error)
        if state.get("validation_passed") or state.get("recursion_count", 0) >= 3 or not state.get("design_review"):
            return END
        return "synthesis"
        
    workflow.add_conditional_edges(
        "validator",
        validator_conditional,
        {
            END: END,
            "synthesis": "synthesis"
        }
    )
    
    return workflow.compile(checkpointer=MemorySaver())

graph = build_graph()
