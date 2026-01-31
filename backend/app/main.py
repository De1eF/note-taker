from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import re
from bson import ObjectId
from app.database import sheet_collection
from app.models import SheetModel, UpdateSheetModel, Position

app = FastAPI()

# Allow CORS for Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Helper Functions ---

async def parse_and_update_connections(sheet_id: str, content: str):
    """
    1. Parse hashtags from content (e.g., #idea).
    2. Find other sheets containing those tags.
    3. Update connections list for the source sheet.
    """
    # Regex to find tags
    hashtags = set(re.findall(r"#(\w+)", content))
    
    if not hashtags:
        return []

    # Find sheets that have content matching these hashtags
    # Note: simple regex search in Mongo. For production, maintain a 'tags' array field.
    regex_queries = [{"content": {"$regex": f"#{tag}\\b"}} for tag in hashtags]
    
    related_cursor = sheet_collection.find({
        "$or": regex_queries,
        "_id": {"$ne": ObjectId(sheet_id)},
        "is_deleted": False
    })
    
    related_ids = []
    async for doc in related_cursor:
        related_ids.append(str(doc["_id"]))
    
    # Update the source sheet's connection list
    await sheet_collection.update_one(
        {"_id": ObjectId(sheet_id)},
        {"$set": {"connections": related_ids}}
    )
    
    # (Optional) Bi-directional update: Update the other sheets to point back to this one
    if related_ids:
        await sheet_collection.update_many(
            {"_id": {"$in": [ObjectId(rid) for rid in related_ids]}},
            {"$addToSet": {"connections": sheet_id}}
        )

    return related_ids

# --- API Routes ---

@app.post("/sheets/", response_model=SheetModel)
async def create_new_sheet(sheet: SheetModel):
    new_sheet = sheet.model_dump(by_alias=True, exclude=["id"])
    result = await sheet_collection.insert_one(new_sheet)
    created_sheet = await sheet_collection.find_one({"_id": result.inserted_id})
    return created_sheet

@app.post("/sheets/{id}/duplicate", response_model=SheetModel)
async def duplicate_sheet(id: str):
    original = await sheet_collection.find_one({"_id": ObjectId(id)})
    if not original:
        raise HTTPException(status_code=404, detail="Sheet not found")
    
    # Offset position slightly so it doesn't overlap perfectly
    new_pos = Position(x=original['positionInSpace']['x'] + 20, y=original['positionInSpace']['y'] + 20)
    
    new_sheet_data = {
        "title": f"{original['title']} (Copy)",
        "content": original['content'],
        "connections": [], # Connections recalculated shortly
        "positionInSpace": new_pos.model_dump(),
        "is_deleted": False
    }
    
    result = await sheet_collection.insert_one(new_sheet_data)
    new_id = str(result.inserted_id)
    
    # Recalculate connections
    await parse_and_update_connections(new_id, new_sheet_data['content'])
    
    created_sheet = await sheet_collection.find_one({"_id": result.inserted_id})
    return created_sheet

@app.post("/sheets/{id}/connections")
async def create_connections_to_sheets(id: str):
    """Re-scans content and updates connections."""
    sheet = await sheet_collection.find_one({"_id": ObjectId(id)})
    if not sheet:
        raise HTTPException(status_code=404, detail="Sheet not found")
        
    related_ids = await parse_and_update_connections(id, sheet['content'])
    return {"message": "Connections updated", "connected_to": related_ids}

@app.get("/sheets/{id}", response_model=SheetModel)
async def get_sheet_by_id(id: str):
    sheet = await sheet_collection.find_one({"_id": ObjectId(id)})
    if sheet:
        return sheet
    raise HTTPException(status_code=404, detail="Sheet not found")

@app.get("/sheets/", response_model=List[SheetModel])
async def get_all_sheets():
    """Returns all non-deleted sheets."""
    sheets = []
    cursor = sheet_collection.find({"is_deleted": False})
    async for doc in cursor:
        sheets.append(doc)
    return sheets

@app.patch("/sheets/{id}", response_model=SheetModel)
async def update_sheet_data(id: str, update_data: UpdateSheetModel):
    # Filter out None values
    data = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if len(data) >= 1:
        update_result = await sheet_collection.update_one(
            {"_id": ObjectId(id)}, 
            {"$set": data}
        )
        if update_result.modified_count == 1:
            # If content changed, we might want to auto-update connections
            if "content" in data:
                await parse_and_update_connections(id, data["content"])
    
    updated_sheet = await sheet_collection.find_one({"_id": ObjectId(id)})
    return updated_sheet

@app.delete("/sheets/{id}")
async def delete_sheet(id: str):
    """Soft delete."""
    result = await sheet_collection.update_one(
        {"_id": ObjectId(id)},
        {"$set": {"is_deleted": True}}
    )
    if result.modified_count == 1:
        return {"message": "Sheet soft deleted"}
    raise HTTPException(status_code=404, detail="Sheet not found")
