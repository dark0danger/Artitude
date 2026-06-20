from pydantic import BaseModel, Field
from typing import List, Optional

class VisualAnalysisSchema(BaseModel):
    dominant_hex_colors: List[str] = Field(description="List of dominant colors in hex format (e.g. #FF0000)")
    typography_style: str = Field(description="Description of the typography style (e.g. Serif, Sans-serif, bold, minimal)")
    layout_density: str = Field(description="Description of the layout density (e.g. high, low, clustered, spacious)")
    visual_theme_tags: List[str] = Field(description="List of visual theme tags (e.g. modern, playful, corporate)")
    review: str = Field(description="Review of the design. Must point out and give a negative review if another brand's identity/logo is present.")
    error: str = Field(description="Error message if unreadable, otherwise leave empty")
    
    @classmethod
    def fallback_error(cls, error_msg: str):
        return cls(
            dominant_hex_colors=[],
            typography_style="unknown",
            layout_density="unknown",
            visual_theme_tags=[],
            review="",
            error=error_msg
        )
