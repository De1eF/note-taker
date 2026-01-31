import os
from typing import List
from fastapi import FastAPI, HTTPException, Body, Depends
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from dotenv import load_dotenv

# Import Models
from app.models import (
    SheetModel, UpdateSheetModel, 
    SpaceModel, UpdateSpaceModel
)

# Import Auth Logic
from app.auth import (
    verify_google_token, 
    create_session_token, 
    get_current_user
)

# 1. Load Environment Variables
load_dotenv()

MONGO_URL = os.getenv("MONGO_URL")
DB_NAME = os.getenv("DB_NAME", "ticket_mapper_db")

# 2. Setup FastAPI
app = FastAPI()

# 3. Setup CORS
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Database Connection
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# ============================================================================
#                                 AUTH ROUTES
# ============================================================================

@app.post("/auth/login")
async def login(data: dict = Body(...)):
    """
    Exchanges a Google ID Token for an internal Session Token.
    """
    google_token = data.get("token")
    if not google_token:
        raise HTTPException(status_code=400, detail="Missing Google Token")

    # 1. Verify with Google
    google_sub = verify_google_token(google_token)
    
    # 2. Mint internal Session Token
    session_token = create_session_token(google_sub)
    
    return {
        "access_token": session_token, 
        "token_type": "bearer",
        "user_id": google_sub
    }

# ============================================================================
#                                SPACE ROUTES
# ============================================================================

@app.get("/spaces", response_model=List[SpaceModel])
async def get_spaces(user_id: str = Depends(get_current_user)):
    """Get all spaces owned by the current user."""
    return await db["spaces"].find({
        "owner_id": user_id, 
        "is_deleted": False
    }).to_list(100)

@app.post("/spaces", response_model=SpaceModel)
async def create_space(space: SpaceModel, user_id: str = Depends(get_current_user)):
    """Create a new space for the current user."""
    space_dict = space.model_dump(by_alias=True, exclude=["id"])
    space_dict["owner_id"] = user_id  # Stamp ownership
    
    new_space = await db["spaces"].insert_one(space_dict)
    return await db["spaces"].find_one({"_id": new_space.inserted_id})

@app.put("/spaces/{id}", response_model=SpaceModel)
async def update_space(id: str, update: UpdateSpaceModel, user_id: str = Depends(get_current_user)):
    """Update a space (only if owned by user)."""
    # 1. Filter update data
    update_data = {k: v for k, v in update.model_dump(exclude_unset=True).items()}
    
    if len(update_data) >= 1:
        # 2. Perform update with owner check
        result = await db["spaces"].update_one(
            {"_id": ObjectId(id), "owner_id": user_id}, 
            {"$set": update_data}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Space not found or access denied")

    return await db["spaces"].find_one({"_id": ObjectId(id)})

@app.get("/spaces/{space_id}/sheets", response_model=List[SheetModel])
async def get_sheets_in_space(space_id: str, user_id: str = Depends(get_current_user)):
    """Get all sheets referenced by a space (only if space matches owner)."""
    
    # 1. Verify Space Ownership
    space = await db["spaces"].find_one({
        "_id": ObjectId(space_id), 
        "owner_id": user_id
    })
    
    if not space:
        raise HTTPException(status_code=404, detail="Space not found or access denied")
        
    target_ids = space.get("sheet_ids", [])
    if not target_ids:
        return []
    
    # 2. Fetch Sheets (Double check ownership for security)
    obj_ids = [ObjectId(sid) for sid in target_ids]
    
    sheets = await db["sheets"].find({
        "_id": {"$in": obj_ids},
        "owner_id": user_id,  # Extra security layer
        "is_deleted": False
    }).to_list(1000)
    
    return sheets

# ============================================================================
#                                SHEET ROUTES
# ============================================================================

@app.post("/sheets", response_model=SheetModel)
async def create_sheet(sheet: SheetModel, user_id: str = Depends(get_current_user)):
    """Create a new sheet for the current user."""
    sheet_dict = sheet.model_dump(by_alias=True, exclude=["id"])
    sheet_dict["owner_id"] = user_id # Stamp ownership
    
    new_sheet = await db["sheets"].insert_one(sheet_dict)
    return await db["sheets"].find_one({"_id": new_sheet.inserted_id})

@app.put("/sheets/{id}", response_model=SheetModel)
async def update_sheet(id: str, update: UpdateSheetModel, user_id: str = Depends(get_current_user)):
    """Update a sheet (only if owned by user)."""
    update_data = {k: v for k, v in update.model_dump(exclude_unset=True).items()}
    
    if len(update_data) >= 1:
        result = await db["sheets"].update_one(
            {"_id": ObjectId(id), "owner_id": user_id}, 
            {"$set": update_data}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Sheet not found or access denied")

    return await db["sheets"].find_one({"_id": ObjectId(id)})

@app.delete("/sheets/{id}")
async def delete_sheet(id: str, user_id: str = Depends(get_current_user)):
    """Hard delete a sheet (only if owned by user)."""
    result = await db["sheets"].delete_one({"_id": ObjectId(id), "owner_id": user_id})
    
    if result.deleted_count == 1:
        return {"message": "Sheet deleted successfully"}
        
    raise HTTPException(status_code=404, detail="Sheet not found or access denied")
