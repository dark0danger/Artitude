from pydantic import BaseModel, Field
from typing import List, Literal, Optional

class RoutingDecisionSchema(BaseModel):
    decision: Literal["BRAND_ONLY", "COMPETITOR_ONLY", "CROSS_AUDIT"] = Field(
        description="The classification of the user query."
    )

class ValidationFeedbackSchema(BaseModel):
    is_compliant: bool = Field(description="True if the synthesized report matches the source constraints, false otherwise.")
    feedback_warnings: List[str] = Field(description="List of feedback warnings or missing evidence if compliance failed.")




class ConsistencyFinding(BaseModel):
    element: str = Field(description="The design element being evaluated (e.g., 'Primary Color', 'Headline Font').")
    status: Literal["consistent", "inconsistent", "needs_attention"] = Field(description="Whether this element aligns with brand guidelines.")
    detail: str = Field(description="Explanation of the finding.")
    bounding_box: Optional[List[float]] = Field(description="Optional [x_percentage, y_percentage, width_percentage, height_percentage] coordinates (0.0-100.0) highlighting the element.")

class BrandConsistencySection(BaseModel):
    consistency_score: int = Field(description="Overall brand consistency score from 0 to 100.")
    findings: List[ConsistencyFinding] = Field(description="List of individual consistency findings.")

class MarketCollisionItem(BaseModel):
    brand_name: str = Field(description="Name of the existing brand this design may collide with.")
    similarity_aspect: str = Field(description="What aspect is similar (e.g., 'color scheme', 'logo layout').")
    risk_level: Literal["low", "medium", "high"] = Field(description="How risky this similarity is.")
    detail: str = Field(description="Explanation of the collision.")

class MarketCollisionSection(BaseModel):
    collisions: List[MarketCollisionItem] = Field(description="List of potential brand collisions found. Empty list if none detected.")

class EnhancementSuggestion(BaseModel):
    category: str = Field(description="Category of the suggestion (e.g., 'Typography', 'Color Harmony', 'Layout').")
    suggestion: str = Field(description="The actionable improvement suggestion.")
    impact: Literal["low", "medium", "high"] = Field(description="Expected impact of implementing this suggestion.")
    bounding_box: Optional[List[float]] = Field(description="Optional [x_percentage, y_percentage, width_percentage, height_percentage] coordinates (0.0-100.0) highlighting the area to enhance.")

class EnhancementsSection(BaseModel):
    suggestions: List[EnhancementSuggestion] = Field(description="List of actionable design enhancement suggestions.")

class DesignReviewSchema(BaseModel):
    brand_consistency: BrandConsistencySection = Field(description="Analysis of the design against brand guidelines.")
    market_collision: MarketCollisionSection = Field(description="Check for accidental similarities with existing market brands.")
    enhancements: EnhancementsSection = Field(description="Actionable suggestions to elevate the design to world-class standards.")
