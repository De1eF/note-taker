from pydantic import BaseModel, Field, BeforeValidator
from typing import List, Optional
from typing_extensions import Annotated

PyObjectId = Annotated[str, BeforeValidator(str)]

# --- SHARED/EXISTING MODELS ---

class Position(BaseModel):
    x: float
    y: float

class SheetModel(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    title: str
    content: str
    connections: List[str] = [] 
    positionInSpace: Position
    width: float = 320.0 
    color: str = 'default' 
    collapsed: bool = False
    collapsed_headers: List[str] = []
    is_deleted: bool = False

class UpdateSheetModel(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    connections: Optional[List[str]] = None
    positionInSpace: Optional[Position] = None
    width: Optional[float] = None
    color: Optional[str] = None 
    collapsed: Optional[bool] = None
    collapsed_headers: Optional[List[str]] = None
    is_deleted: Optional[bool] = None

# --- NEW: SPACE MODELS ---

class ViewState(BaseModel):
    x: float = 0
    y: float = 0
    scale: float = 1.0

class SpaceModel(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    name: str
    sheet_ids: List[str] = [] 
    view_state: ViewState = ViewState()
    is_deleted: bool = False

class UpdateSpaceModel(BaseModel):
    name: Optional[str] = None
    sheet_ids: Optional[List[str]] = None
    view_state: Optional[ViewState] = None
    is_deleted: Optional[bool] = None
    
