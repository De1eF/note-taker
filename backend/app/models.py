from pydantic import BaseModel, Field, BeforeValidator
from typing import List, Optional
from typing_extensions import Annotated

PyObjectId = Annotated[str, BeforeValidator(str)]

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
    # NEW: Color field (default to 'default')
    color: str = 'default' 
    is_deleted: bool = False

class UpdateSheetModel(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    connections: Optional[List[str]] = None
    positionInSpace: Optional[Position] = None
    width: Optional[float] = None
    # NEW: Allow updating color
    color: Optional[str] = None 
    is_deleted: Optional[bool] = None
