from pydantic import BaseModel, Field, BeforeValidator
from typing import List, Optional
from typing_extensions import Annotated

# Helper to handle MongoDB ObjectId as string
PyObjectId = Annotated[str, BeforeValidator(str)]

class Position(BaseModel):
    x: float
    y: float

class SheetModel(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    title: str
    content: str
    connections: List[str] = [] # List of Sheet IDs
    positionInSpace: Position
    is_deleted: bool = False

class UpdateSheetModel(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    connections: Optional[List[str]] = None
    positionInSpace: Optional[Position] = None
    is_deleted: Optional[bool] = None
    